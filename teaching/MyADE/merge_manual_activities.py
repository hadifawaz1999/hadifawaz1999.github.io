"""Merge manually maintained project/suivi data into an ICS-generated database."""

from __future__ import annotations

import argparse
import json
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ALLOWED_CATEGORY = "project/suivi"


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"File not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ValueError(f"Top-level JSON value in {path} must be an object")
    return value


def validate_manual_data(
    manual: dict[str, Any], base_courses: dict[str, Any]
) -> list[str]:
    errors: list[str] = []
    manual_courses = manual.get("courses", {})
    suivis = manual.get("suivis", [])

    if not isinstance(manual_courses, dict):
        errors.append("manual 'courses' must be an object")
        manual_courses = {}
    if not isinstance(suivis, list):
        errors.append("manual 'suivis' must be an array")
        suivis = []

    all_course_ids = set(base_courses) | set(manual_courses)

    for key, course in manual_courses.items():
        if not isinstance(course, dict):
            errors.append(f"manual course {key!r} must be an object")
            continue
        if course.get("id") != key:
            errors.append(f"manual course key {key!r} must match its id")
        if not course.get("name"):
            errors.append(f"manual course {key!r} requires a name")
        if course.get("category") != ALLOWED_CATEGORY:
            errors.append(
                f"manual course {key!r} category must be {ALLOWED_CATEGORY!r}"
            )
        if key in base_courses:
            errors.append(
                f"manual course {key!r} already exists in the ICS database; "
                "reference it from a suivi instead of redefining it"
            )
        if not isinstance(course.get("audiences", []), list):
            errors.append(f"manual course {key!r} audiences must be an array")

    seen_ids: set[str] = set()
    for index, suivi in enumerate(suivis):
        label = f"suivi #{index}"
        if not isinstance(suivi, dict):
            errors.append(f"{label} must be an object")
            continue
        suivi_id = suivi.get("id")
        if not isinstance(suivi_id, str) or not suivi_id.strip():
            errors.append(f"{label} requires a non-empty id")
        elif suivi_id in seen_ids:
            errors.append(f"duplicate suivi id: {suivi_id}")
        else:
            seen_ids.add(suivi_id)
        if not suivi.get("name"):
            errors.append(f"{label} requires a name")
        if suivi.get("category") != ALLOWED_CATEGORY:
            errors.append(f"{label} category must be {ALLOWED_CATEGORY!r}")
        hours = suivi.get("hours")
        if isinstance(hours, bool) or not isinstance(hours, (int, float)):
            errors.append(f"{label} requires numeric hours")
        elif hours <= 0:
            errors.append(f"{label} hours must be greater than 0")
        course_id = suivi.get("course_id")
        if course_id not in manual_courses:
            errors.append(
                f"{label} course_id {course_id!r} must reference its own "
                "course under manual 'courses'"
            )
        related_course_id = suivi.get("related_course_id")
        if related_course_id is not None and related_course_id not in all_course_ids:
            errors.append(
                f"{label} references unknown related_course_id "
                f"{related_course_id!r}"
            )
        if related_course_id == course_id:
            errors.append(f"{label} related_course_id must differ from course_id")
        for field in ("audiences", "students"):
            if not isinstance(suivi.get(field, []), list):
                errors.append(f"{label} field {field!r} must be an array")

    return errors


def merge_databases(base: dict[str, Any], manual: dict[str, Any]) -> dict[str, Any]:
    errors = validate_manual_data(manual, base.get("courses", {}))
    if errors:
        raise ValueError("Manual data validation failed:\n- " + "\n- ".join(errors))

    merged = deepcopy(base)
    merged.setdefault("courses", {})
    merged.setdefault("suivis", [])

    for course_id, course in manual.get("courses", {}).items():
        merged["courses"][course_id] = deepcopy(course)

    merged["suivis"] = deepcopy(manual.get("suivis", []))
    timezone_name = merged.get("metadata", {}).get("timezone", "Europe/Paris")
    merged.setdefault("metadata", {})["manual_data"] = {
        "schema_version": manual.get("schema_version", "1.0"),
        "merged_at": datetime.now(ZoneInfo(timezone_name)).isoformat(),
    }
    return merged


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Merge manual project/suivi data into courses.json"
    )
    parser.add_argument(
        "-bj", "--base-json", type=Path, default=Path("./data/courses.json")
    )
    parser.add_argument(
        "-mj", "--manual-json", type=Path, default=Path("./data/manual_activities.json")
    )
    parser.add_argument(
        "-o", "--output", type=Path, default=Path("./data/courses_complete.json")
    )
    args = parser.parse_args()

    try:
        base = load_json(args.base_json)
        manual = load_json(args.manual_json)
        merged = merge_databases(base, manual)
    except ValueError as exc:
        print(f"Merge FAILED\n{exc}")
        return 1

    args.output.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Created {args.output}")
    print(f"- Courses: {len(merged.get('courses', {}))}")
    print(f"- Sessions: {len(merged.get('sessions', []))}")
    print(f"- Suivis: {len(merged.get('suivis', []))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
