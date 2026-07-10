"""
Alignment tests for ADECal.ics and courses.json.

Run:
    python test_alignment.py ADECal.ics courses.json

Or with unittest:
    python -m unittest test_alignment.py
"""

from __future__ import annotations

import argparse
import json
import tempfile
import unittest
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import ade_ics_to_json as converter


def without_generated_at(database: dict[str, Any]) -> dict[str, Any]:
    """Return a deep copy without volatile generation metadata."""
    copied = json.loads(json.dumps(database))
    copied.get("metadata", {}).pop("generated_at", None)
    return copied


class AlignmentValidator:
    def __init__(self, ics_path: Path, json_path: Path) -> None:
        self.ics_path = ics_path
        self.json_path = json_path
        self.database = json.loads(json_path.read_text(encoding="utf-8"))

    def validate(self) -> list[str]:
        errors: list[str] = []

        if not self.ics_path.is_file():
            return [f"ICS file does not exist: {self.ics_path}"]
        if not self.json_path.is_file():
            return [f"JSON file does not exist: {self.json_path}"]

        errors.extend(self._compare_with_fresh_conversion())
        errors.extend(self._validate_schema_and_references())
        errors.extend(self._validate_session_counters())
        errors.extend(self._validate_unique_sessions())
        errors.extend(self._validate_time_values())
        return errors

    def _compare_with_fresh_conversion(self) -> list[str]:
        """
        Regenerate JSON from the ICS with the production converter and compare
        the semantic result. This is the strongest alignment check.
        """
        with tempfile.TemporaryDirectory() as tmp:
            generated_json = Path(tmp) / "courses.json"
            generated_report = Path(tmp) / "import_report.json"

            converter.build_database(
                ics_path=self.ics_path,
                output_path=generated_json,
                report_path=generated_report,
                timezone_name=self.database.get("metadata", {}).get(
                    "timezone", converter.TIMEZONE
                ),
            )

            expected = json.loads(generated_json.read_text(encoding="utf-8"))
            actual = self.database

        if without_generated_at(expected) != without_generated_at(actual):
            return [
                "courses.json is not aligned with the ICS: regenerating it "
                "produces different semantic content."
            ]
        return []

    def _validate_schema_and_references(self) -> list[str]:
        errors: list[str] = []
        courses = self.database.get("courses")
        sessions = self.database.get("sessions")
        other_events = self.database.get("other_events")

        if not isinstance(courses, dict):
            errors.append("'courses' must be an object.")
            courses = {}
        if not isinstance(sessions, list):
            errors.append("'sessions' must be an array.")
            sessions = []
        if not isinstance(other_events, list):
            errors.append("'other_events' must be an array.")

        required_session_fields = {
            "id",
            "course_id",
            "session_type",
            "session_number",
            "start",
            "end",
            "duration_minutes",
            "location",
        }

        for index, session in enumerate(sessions):
            missing = required_session_fields - session.keys()
            if missing:
                errors.append(f"Session #{index} is missing fields: {sorted(missing)}")
                continue

            course_id = session["course_id"]
            if course_id not in courses:
                errors.append(
                    f"Session {session.get('id')} references unknown course "
                    f"{course_id!r}."
                )

            location = session.get("location")
            if not isinstance(location, dict) or not location.get("raw"):
                errors.append(f"Session {session.get('id')} has no valid raw location.")

        return errors

    def _validate_session_counters(self) -> list[str]:
        errors: list[str] = []
        grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)

        for session in self.database.get("sessions", []):
            grouped[(session["course_id"], session["session_type"])].append(session)

        for (course_id, session_type), sessions in grouped.items():
            ordered = sorted(
                sessions,
                key=lambda s: (
                    s["start"],
                    s["end"],
                    s["location"]["raw"],
                    s.get("source", {}).get("original_title", ""),
                ),
            )
            actual_numbers = [s["session_number"] for s in ordered]
            expected_numbers = list(range(1, len(ordered) + 1))

            if actual_numbers != expected_numbers:
                errors.append(
                    f"Invalid counter sequence for {course_id}/{session_type}: "
                    f"expected {expected_numbers}, got {actual_numbers}."
                )

        return errors

    def _validate_unique_sessions(self) -> list[str]:
        errors: list[str] = []
        ids: set[str] = set()
        semantic_keys: set[tuple[Any, ...]] = set()

        for session in self.database.get("sessions", []):
            session_id = session["id"]
            if session_id in ids:
                errors.append(f"Duplicate session id: {session_id}")
            ids.add(session_id)

            key = (
                session["course_id"],
                session["start"],
                session["end"],
                session["session_type"],
                session["location"]["raw"],
            )
            if key in semantic_keys:
                errors.append(f"Duplicate semantic session: {key}")
            semantic_keys.add(key)

        return errors

    def _validate_time_values(self) -> list[str]:
        errors: list[str] = []

        for collection_name in ("sessions", "other_events"):
            for item in self.database.get(collection_name, []):
                try:
                    start = datetime.fromisoformat(item["start"])
                    end = datetime.fromisoformat(item["end"])
                except (KeyError, TypeError, ValueError):
                    errors.append(
                        f"{collection_name} item {item.get('id')} has invalid "
                        "ISO start/end timestamps."
                    )
                    continue

                if start.tzinfo is None or end.tzinfo is None:
                    errors.append(
                        f"{collection_name} item {item.get('id')} has a naive "
                        "timestamp without timezone."
                    )
                if end <= start:
                    errors.append(
                        f"{collection_name} item {item.get('id')} ends before "
                        "or at its start time."
                    )

                expected_duration = int((end - start).total_seconds() // 60)
                if item.get("duration_minutes") != expected_duration:
                    errors.append(
                        f"{collection_name} item {item.get('id')} has duration "
                        f"{item.get('duration_minutes')}, expected "
                        f"{expected_duration}."
                    )

        return errors


class TestIcsJsonAlignment(unittest.TestCase):
    ics_path = Path("ADECal.ics")
    json_path = Path("courses.json")

    def test_alignment(self) -> None:
        validator = AlignmentValidator(self.ics_path, self.json_path)
        errors = validator.validate()
        self.assertFalse(errors, "\n" + "\n".join(f"- {e}" for e in errors))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify that courses.json is aligned with the source ICS."
    )
    parser.add_argument(
        "-i",
        "--input",
        default=Path("./data/ADECal.ics"),
        type=Path,
        help="Input ADE .ics file",
    )
    parser.add_argument(
        "-j",
        "--json",
        default=Path("./data/courses.json"),
        type=Path,
        help="Input JSON file",
    )
    args = parser.parse_args()

    errors = AlignmentValidator(args.input, args.json).validate()
    if errors:
        print("Alignment FAILED")
        for error in errors:
            print(f"- {error}")
        return 1

    database = json.loads(args.json.read_text(encoding="utf-8"))
    print("Alignment OK")
    print(f"- Courses: {len(database.get('courses', {}))}")
    print(f"- Sessions: {len(database.get('sessions', []))}")
    print(f"- Other events: {len(database.get('other_events', []))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
