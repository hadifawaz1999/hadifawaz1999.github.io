#!/usr/bin/env bash

python3 ade_ics_to_json.py

python3 test_alignment.py

python3 merge_manual_activities.py

python3 test_complete_database.py

echo "Pipeline completed successfully: $FINAL_JSON"
