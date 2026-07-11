# ADE Teaching Dashboard

This project converts an ADE calendar export (`.ics`) into a structured JSON database and provides an interactive dashboard to visualize and analyze an academic year's teaching activities.

---

# Project structure

```text
project/
├── vendor
│   └── plotly.min.js
├── test_complete_database.py
├── test_alignment.py
├── run_pipeline.sh
├── README.md
├── merge_manual_activities.py
├── js
│   ├── views
│   │   ├── timelineView.js
│   │   ├── serviceSummary.js
│   │   └── analysisView.js
│   ├── data.js
│   └── app.js
├── index.html
├── data
│   ├── manual_activities.json
│   ├── import_report.json
│   ├── courses.json
│   ├── courses_complete.json
│   └── ADECal.ics
├── css
│   ├── timeline.css
│   ├── filters.css
│   └── dashboard.css
└── ade_ics_to_json.py
```

---

# Using the project

## 1. Export your ADE calendar

Export your complete academic year from ADE as an **ICS** file.

Rename it:

```text
ADECal.ics
```

and place it inside:

```text
data/
```

replacing the previous file.

---

## 2. Fill the manual activities (optional)

ADE calendars usually do not contain activities such as:

- student supervision
- projects
- internships
- thesis supervision
- other teaching duties

These activities can be added manually inside:

```text
data/manual_activities.json
```

Each activity follows the same general structure as regular courses but is entered manually.

Example:

```json
{
    "schema_version": "1.1",
    "courses": {
        "open-source-project": {
            "id": "open-source-project",
            "name": "Open Source Project",
            "aliases": [],
            "category": "project/suivi",
            "audiences": [
                {
                    "source_label": "3A Info",
                    "year": "3A",
                    "diploma": "Info IR",
                    "establishment": "ENSISA",
                    "track": null,
                    "study_mode": null
                }
            ]
        }
    },
    "suivis": [
        {
            "id": "open-source-project",
            "name": "Open Source Project",
            "course_id": "open-source-project",
            "related_course_id": "open-source",
            "category": "project/suivi",
            "hours": 10,
            "description": "Development of an open source project.",
            "audiences": [
                {
                    "source_label": "3A Info",
                    "year": "3A",
                    "diploma": "Info IR",
                    "establishment": "ENSISA",
                    "track": null,
                    "study_mode": null
                }
            ],
            "students": [],
            "metadata": null
        }
    ]
}
```

These activities are kept separate from ADE courses and are merged automatically during the pipeline.

If you have no additional activities, simply leave the file empty.

---

## 3. Run the pipeline

Execute:

```bash
./run_pipeline.sh
```

The pipeline automatically performs all required steps:

1. converts the ADE ICS file into `courses.json`
2. validates the generated database
3. merges the manual activities
4. validates the final merged database
5. generates `courses_complete.json`
6. generates `import_report.json`

No individual Python scripts need to be executed manually.

---

# Dashboard

The dashboard reads:

```text
data/courses_complete.json
```

Once the pipeline finishes successfully, simply open `index.html` (or serve the project with a local web server) to explore the updated dashboard.

---

# Updating for a new academic year

For a new academic year:

1. Replace `data/ADECal.ics`.
2. Update `data/manual_activities.json` if necessary.
3. Run:

```bash
./run_pipeline.sh
```

The dashboard will automatically use the newly generated database.