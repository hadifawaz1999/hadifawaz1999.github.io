"""Validate that manual merging preserves the ICS database and adds valid suivis."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from merge_manual_activities import ALLOWED_CATEGORY, load_json, validate_manual_data


def strip_volatile_metadata(value: dict[str, Any]) -> dict[str, Any]:
    copied = json.loads(json.dumps(value))
    copied.get("metadata", {}).pop("manual_data", None)
    return copied


def validate_complete(
    base_path: Path, manual_path: Path, complete_path: Path
) -> list[str]:
    errors: list[str] = []
    base = load_json(base_path)
    manual = load_json(manual_path)
    complete = load_json(complete_path)

    errors.extend(validate_manual_data(manual, base.get("courses", {})))

    # All ICS-derived sections must remain byte-for-byte equivalent semantically.
    for key in ("sessions", "other_events"):
        if complete.get(key) != base.get(key):
            errors.append(f"merged database changed base section {key!r}")

    base_metadata = strip_volatile_metadata({"metadata": base.get("metadata", {})})
    complete_metadata = strip_volatile_metadata(
        {"metadata": complete.get("metadata", {})}
    )
    if complete_metadata != base_metadata:
        errors.append("merged database changed non-manual base metadata")

    expected_courses = dict(base.get("courses", {}))
    expected_courses.update(manual.get("courses", {}))
    if complete.get("courses") != expected_courses:
        errors.append("merged courses do not equal base courses plus manual courses")

    if complete.get("suivis") != manual.get("suivis", []):
        errors.append("merged suivis do not match manual suivis")

    courses = complete.get("courses", {})
    seen_ids: set[str] = set()
    for index, suivi in enumerate(complete.get("suivis", [])):
        suivi_id = suivi.get("id")
        if suivi_id in seen_ids:
            errors.append(f"duplicate merged suivi id: {suivi_id}")
        seen_ids.add(suivi_id)
        if suivi.get("category") != ALLOWED_CATEGORY:
            errors.append(f"merged suivi #{index} has invalid category")
        course_id = suivi.get("course_id")
        if course_id not in manual.get("courses", {}):
            errors.append(
                f"merged suivi #{index} does not reference its own manual course"
            )
        related_course_id = suivi.get("related_course_id")
        if related_course_id is not None and related_course_id not in courses:
            errors.append(f"merged suivi #{index} references an unknown related course")
        hours = suivi.get("hours")
        if isinstance(hours, bool) or not isinstance(hours, (int, float)) or hours <= 0:
            errors.append(f"merged suivi #{index} has invalid hours")
        if "session_type" in suivi or "session_number" in suivi:
            errors.append(f"merged suivi #{index} must not contain session fields")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the complete database")
    parser.add_argument(
        "-bj", "--base-json", type=Path, default=Path("./data/courses.json")
    )
    parser.add_argument(
        "-mj", "--manual-json", type=Path, default=Path("./data/manual_activities.json")
    )
    parser.add_argument(
        "-cj",
        "--complete-json",
        type=Path,
        default=Path("./data/courses_complete.json"),
    )
    args = parser.parse_args()

    try:
        errors = validate_complete(args.base_json, args.manual_json, args.complete_json)
    except ValueError as exc:
        print(f"Complete database validation FAILED\n- {exc}")
        return 1

    if errors:
        print("Complete database validation FAILED")
        for error in errors:
            print(f"- {error}")
        return 1

    complete = load_json(args.complete_json)
    print("Complete database validation OK")
    print(f"- Courses: {len(complete.get('courses', {}))}")
    print(f"- Sessions: {len(complete.get('sessions', []))}")
    print(f"- Other events: {len(complete.get('other_events', []))}")
    print(f"- Suivis: {len(complete.get('suivis', []))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
