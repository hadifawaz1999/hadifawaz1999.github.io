"""
Convert an ADE .ics calendar into a normalized JSON course database.

Outputs:
  - courses.json
  - import_report.json

No third-party package is required.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

TIMEZONE = "Europe/Paris"

COURSE_ALIASES = {
    "Deep Learning-1": "Deep Learning",
    "Deep Learning - 1": "Deep Learning",
    "Open Source - 1": "Open Source",
    "Open Source-1": "Open Source",
    "Intelligence Artificielle - 1": "Intelligence Artificielle",
    "Intelligence Artificielle-1": "Intelligence Artificielle",
}

# Titles ending in "-1" are exams in this ADE export.
EXAM_TITLE_PATTERN = re.compile(r"\s*-\s*1\s*$")

OTHER_EVENT_CATEGORIES = {
    "Conseil IR": "administrative",
}

# ADE uses a distinct title prefix for certain teaching types.
# These are not course aliases: they are explicit course/type encodings.
TITLE_SESSION_OVERRIDES = {
    "AFouille de données": {
        "course_name": "Fouille de données",
        "session_type": "TD",
    },
}

# Some ADE course descriptions list only the audience and omit the teaching type.
# These course-level overrides apply to non-exam sessions after title normalization.
COURSE_SESSION_TYPE_OVERRIDES = {
    "Deep Learning": "TD",
}

# These mappings are deliberately explicit and easy to adjust.
AUDIENCE_MAPPINGS = {
    "1A info": {
        "year": "1A",
        "diploma": "Info IR",
        "establishment": "ENSISA",
        "track": None,
        "study_mode": None,
    },
    "2A info": {
        "year": "2A",
        "diploma": "Info IR",
        "establishment": "ENSISA",
        "track": None,
        "study_mode": None,
    },
    "3A info": {
        "year": "3A",
        "diploma": "Info IR",
        "establishment": "ENSISA",
        "track": None,
        "study_mode": None,
    },
    "3A info P Data": {
        "year": "3A",
        "diploma": "Info IR",
        "establishment": "ENSISA",
        "track": "Data",
        "study_mode": "FI",
    },
    "3A Alt IR P Data": {
        "year": "3A",
        "diploma": "Info IR",
        "establishment": "ENSISA",
        "track": "Data",
        "study_mode": "FA",
    },
    "M2 MIAGE FA Choix Big Data": {
        "year": "M2",
        "diploma": "MIAGE",
        "establishment": "FST",
        "track": "Big Data",
        "study_mode": "FA",
    },
    "M2 MIAGE FI Choix Big Data": {
        "year": "M2",
        "diploma": "MIAGE",
        "establishment": "FST",
        "track": "Big Data",
        "study_mode": "FI",
    },
    "M2 IM": {
        "year": "M2",
        "diploma": "IM",
        "establishment": "FST",
        "track": None,
        "study_mode": None,
    },
    "M2 MATHEMATIQUES": {
        "year": "M2",
        "diploma": "IMDS",
        "establishment": "FST",
        "track": None,
        "study_mode": None,
    },
}

EXPORT_LINE_PATTERN = re.compile(r"^\(Exporté le:", re.IGNORECASE)
TD_PREFIX_PATTERN = re.compile(r"^(TD)(\d+)?\s+(.+)$", re.IGNORECASE)


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or "item"


def unfold_ics(text: str) -> list[str]:
    """Unfold RFC 5545 continuation lines."""
    raw_lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    unfolded: list[str] = []
    for line in raw_lines:
        if line.startswith((" ", "\t")) and unfolded:
            unfolded[-1] += line[1:]
        else:
            unfolded.append(line)
    return unfolded


def unescape_ics_text(value: str) -> str:
    return (
        value.replace(r"\N", "\n")
        .replace(r"\n", "\n")
        .replace(r"\,", ",")
        .replace(r"\;", ";")
        .replace(r"\\", "\\")
    )


def parse_property(line: str) -> tuple[str, dict[str, str], str]:
    if ":" not in line:
        return line, {}, ""
    head, value = line.split(":", 1)
    pieces = head.split(";")
    name = pieces[0].upper()
    params: dict[str, str] = {}
    for piece in pieces[1:]:
        if "=" in piece:
            key, param_value = piece.split("=", 1)
            params[key.upper()] = param_value
    return name, params, unescape_ics_text(value)


def parse_ics(path: Path) -> tuple[dict[str, str], list[dict[str, Any]]]:
    lines = unfold_ics(path.read_text(encoding="utf-8-sig"))
    calendar_meta: dict[str, str] = {}
    events: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for line in lines:
        if line == "BEGIN:VEVENT":
            current = {}
            continue
        if line == "END:VEVENT":
            if current is not None:
                events.append(current)
            current = None
            continue
        if not line or line in {"BEGIN:VCALENDAR", "END:VCALENDAR"}:
            continue

        name, params, value = parse_property(line)
        target = current if current is not None else calendar_meta
        target[name.lower()] = {"value": value, "params": params}

    return calendar_meta, events


def parse_datetime(prop: dict[str, Any], target_tz: ZoneInfo) -> datetime:
    value = prop["value"]
    params = prop.get("params", {})

    if re.fullmatch(r"\d{8}T\d{6}Z", value):
        dt = datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
    elif re.fullmatch(r"\d{8}T\d{6}", value):
        tzid = params.get("TZID")
        source_tz = ZoneInfo(tzid) if tzid else target_tz
        dt = datetime.strptime(value, "%Y%m%dT%H%M%S").replace(tzinfo=source_tz)
    elif re.fullmatch(r"\d{8}", value):
        dt = datetime.strptime(value, "%Y%m%d").replace(tzinfo=target_tz)
    else:
        raise ValueError(f"Unsupported datetime value: {value!r}")

    return dt.astimezone(target_tz)


def clean_description_lines(description: str) -> list[str]:
    result = []
    for raw_line in description.splitlines():
        line = raw_line.strip()
        if not line or EXPORT_LINE_PATTERN.match(line):
            continue
        result.append(line)
    return result


def looks_like_person_name(line: str) -> bool:
    """Best-effort ADE name detector used only to remove instructor/participant lines."""
    if re.match(r"^(TD\d*\s+)?\d[A-Z]\s", line, re.IGNORECASE):
        return False
    if line.startswith("M2 "):
        return False
    words = line.split()
    return len(words) >= 2 and any(word.isupper() and len(word) > 1 for word in words)


def split_audience_and_people(description: str) -> tuple[list[str], list[str]]:
    audience_lines: list[str] = []
    people: list[str] = []
    for line in clean_description_lines(description):
        if looks_like_person_name(line):
            people.append(line)
        else:
            audience_lines.append(line)
    return audience_lines, people


def normalize_course_title(original_title: str) -> tuple[str, bool, str | None]:
    override = TITLE_SESSION_OVERRIDES.get(original_title)
    if override:
        return override["course_name"], False, override["session_type"]

    is_exam = bool(EXAM_TITLE_PATTERN.search(original_title))
    canonical = COURSE_ALIASES.get(original_title, original_title)
    if is_exam and canonical == original_title:
        canonical = EXAM_TITLE_PATTERN.sub("", original_title).strip()
    return canonical, is_exam, None


def parse_location(raw: str) -> dict[str, Any]:
    parts = raw.split("_", 2)
    return {
        "raw": raw,
        "site": parts[0] if len(parts) >= 1 else None,
        "building": parts[1] if len(parts) >= 2 else None,
        "room": parts[2] if len(parts) >= 3 else raw,
    }


def audience_from_label(label: str) -> dict[str, Any]:
    base_label = TD_PREFIX_PATTERN.sub(r"\3", label).strip()
    mapped = AUDIENCE_MAPPINGS.get(base_label)
    if mapped:
        return {"source_label": base_label, **mapped}
    return {
        "source_label": base_label,
        "year": None,
        "diploma": None,
        "establishment": None,
        "track": None,
        "study_mode": None,
    }


def raw_session_type(audience_lines: list[str], is_exam: bool) -> str:
    if is_exam:
        return "EXAM"
    for label in audience_lines:
        match = TD_PREFIX_PATTERN.match(label)
        if match:
            number = match.group(2)
            return f"TD{number}" if number else "TD"
    return "CM"


def unique_dicts(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for item in items:
        marker = json.dumps(item, sort_keys=True, ensure_ascii=False)
        if marker not in seen:
            seen.add(marker)
            result.append(item)
    return result


def build_database(
    ics_path: Path,
    output_path: Path,
    report_path: Path,
    timezone_name: str = TIMEZONE,
) -> None:
    tz = ZoneInfo(timezone_name)
    calendar_meta, raw_events = parse_ics(ics_path)

    course_records: dict[str, dict[str, Any]] = {}
    sessions: list[dict[str, Any]] = []
    other_events: list[dict[str, Any]] = []

    report: dict[str, Any] = {
        "source_file": ics_path.name,
        "event_count": len(raw_events),
        "course_session_count": 0,
        "other_event_count": 0,
        "normalized_aliases": [],
        "unknown_audience_labels": [],
        "duplicate_sessions_removed": [],
        "warnings": [],
    }

    # First pass: parse events and collect the TD groups found for each course.
    parsed_course_events: list[dict[str, Any]] = []
    td_groups_by_course: dict[str, set[str]] = defaultdict(set)

    for raw_event in raw_events:
        try:
            original_title = raw_event["summary"]["value"].strip()
            start = parse_datetime(raw_event["dtstart"], tz)
            end = parse_datetime(raw_event["dtend"], tz)
        except (KeyError, ValueError) as exc:
            report["warnings"].append(f"Skipped malformed event: {exc}")
            continue

        location_raw = raw_event.get("location", {}).get("value", "").strip()
        description = raw_event.get("description", {}).get("value", "")
        audience_lines, people = split_audience_and_people(description)

        if original_title in OTHER_EVENT_CATEGORIES:
            category = OTHER_EVENT_CATEGORIES[original_title]
            other_events.append(
                {
                    "id": f"{slugify(original_title)}-{start:%Y-%m-%d-%H%M}",
                    "title": original_title,
                    "category": category,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "duration_minutes": int((end - start).total_seconds() // 60),
                    "location": parse_location(location_raw),
                    "participants": people,
                }
            )
            continue

        canonical_title, is_exam, forced_session_type = normalize_course_title(
            original_title
        )
        course_id = slugify(canonical_title)
        if (
            canonical_title != original_title
            and original_title not in TITLE_SESSION_OVERRIDES
        ):
            report["normalized_aliases"].append(
                {"original": original_title, "canonical": canonical_title}
            )

        # Teaching-type evidence takes priority over the ``-1`` exam suffix.
        # Therefore an explicitly marked TD, or a course known to be entirely TD,
        # remains TD even when ADE appends ``-1`` to the title.
        audience_type = raw_session_type(audience_lines, is_exam=False)
        detected_type = (
            forced_session_type
            or (audience_type if audience_type.startswith("TD") else None)
            or COURSE_SESSION_TYPE_OVERRIDES.get(canonical_title)
            or ("EXAM" if is_exam else audience_type)
        )
        if detected_type.startswith("TD"):
            td_groups_by_course[course_id].add(detected_type)

        parsed_course_events.append(
            {
                "course_id": course_id,
                "course_name": canonical_title,
                "original_title": original_title,
                "is_exam": is_exam,
                "raw_session_type": detected_type,
                "audience_lines": audience_lines,
                "start_dt": start,
                "end_dt": end,
                "location": parse_location(location_raw),
            }
        )

    # Build course records and normalize a lone numbered TD group to plain "TD".
    for event in parsed_course_events:
        course_id = event["course_id"]
        course = course_records.setdefault(
            course_id,
            {
                "id": course_id,
                "name": event["course_name"],
                "aliases": [],
                "category": "course",
                "audiences": [],
            },
        )

        if (
            event["original_title"] != event["course_name"]
            and event["original_title"] not in TITLE_SESSION_OVERRIDES
        ):
            course["aliases"].append(event["original_title"])

        for source_label in event["audience_lines"]:
            audience = audience_from_label(source_label)
            course["audiences"].append(audience)
            if audience["diploma"] is None:
                report["unknown_audience_labels"].append(audience["source_label"])

        session_type = event["raw_session_type"]
        numbered_groups = {
            group
            for group in td_groups_by_course[course_id]
            if re.fullmatch(r"TD\d+", group)
        }
        if re.fullmatch(r"TD\d+", session_type) and len(numbered_groups) == 1:
            session_type = "TD"

        start = event["start_dt"]
        end = event["end_dt"]
        sessions.append(
            {
                "id": None,
                "course_id": course_id,
                "session_type": session_type,
                "session_number": None,
                "start": start.isoformat(),
                "end": end.isoformat(),
                "duration_minutes": int((end - start).total_seconds() // 60),
                "location": event["location"],
                "source": {
                    "original_title": event["original_title"],
                    "original_audiences": event["audience_lines"],
                },
            }
        )

    # Deduplicate before assigning counters.
    unique_sessions: list[dict[str, Any]] = []
    seen_session_keys: set[tuple[Any, ...]] = set()
    for session in sorted(
        sessions,
        key=lambda s: (
            s["start"],
            s["end"],
            s["course_id"],
            s["session_type"],
            s["location"]["raw"],
            s["source"]["original_title"],
        ),
    ):
        key = (
            session["course_id"],
            session["start"],
            session["end"],
            session["session_type"],
            session["location"]["raw"],
        )
        if key in seen_session_keys:
            report["duplicate_sessions_removed"].append(
                {
                    "course_id": session["course_id"],
                    "start": session["start"],
                    "session_type": session["session_type"],
                    "location": session["location"]["raw"],
                }
            )
            continue
        seen_session_keys.add(key)
        unique_sessions.append(session)

    # Independent counters for CM, TD, TD1, TD2, EXAM, etc., within each course.
    counters: dict[tuple[str, str], int] = defaultdict(int)
    id_counts: dict[str, int] = defaultdict(int)

    for session in unique_sessions:
        counter_key = (session["course_id"], session["session_type"])
        counters[counter_key] += 1
        session["session_number"] = counters[counter_key]

        local_start = datetime.fromisoformat(session["start"])
        id_base = (
            f"{session['course_id']}-"
            f"{local_start:%Y-%m-%d-%H%M}-"
            f"{session['session_type'].lower()}"
        )
        id_counts[id_base] += 1
        session["id"] = (
            id_base if id_counts[id_base] == 1 else f"{id_base}-{id_counts[id_base]}"
        )

    for course in course_records.values():
        course["aliases"] = sorted(set(course["aliases"]))
        course["audiences"] = unique_dicts(course["audiences"])

    report["normalized_aliases"] = unique_dicts(report["normalized_aliases"])
    report["unknown_audience_labels"] = sorted(set(report["unknown_audience_labels"]))
    report["course_session_count"] = len(unique_sessions)
    report["other_event_count"] = len(other_events)

    generated_at = datetime.now(tz).isoformat()
    database = {
        "metadata": {
            "schema_version": "1.0",
            "source": {
                "type": "ics",
                "filename": ics_path.name,
                "calendar_product": calendar_meta.get("prodid", {}).get("value"),
            },
            "timezone": timezone_name,
            "generated_at": generated_at,
        },
        "courses": dict(sorted(course_records.items())),
        "sessions": unique_sessions,
        "other_events": sorted(other_events, key=lambda e: (e["start"], e["title"])),
    }

    output_path.write_text(
        json.dumps(database, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert an ADE ICS calendar into a normalized JSON database."
    )
    parser.add_argument(
        "-i",
        "--ics-file",
        default=Path("./data/ADECal.ics"),
        type=Path,
        help="Input ADE .ics file",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("./data/courses.json"),
        help="Output JSON database (default: courses.json)",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("./data/import_report.json"),
        help="Import report path (default: import_report.json)",
    )
    parser.add_argument(
        "--timezone",
        default=TIMEZONE,
        help=f"Output timezone (default: {TIMEZONE})",
    )
    args = parser.parse_args()

    if not args.ics_file.is_file():
        parser.error(f"ICS file not found: {args.ics_file}")

    build_database(
        ics_path=args.ics_file,
        output_path=args.output,
        report_path=args.report,
        timezone_name=args.timezone,
    )
    print(f"Created {args.output}")
    print(f"Created {args.report}")


if __name__ == "__main__":
    main()
