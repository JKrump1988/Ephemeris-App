ACADEMY_CATALOG = {
    "title": "Ephemeral Academy",
    "description": "A future-ready learning space for astrology study, premium lesson paths, and multimedia course delivery.",
    "courses": [
        {
            "id": "foundations-of-the-chart",
            "title": "Foundations of the Natal Chart",
            "description": "A sample course structure showing how Ephemeral Academy can host beginner modules, mixed lesson formats, and premium expansion.",
            "level": "Beginner",
            "locked": False,
            "cover_theme": "Editorial intro path",
            "modules": [
                {
                    "id": "module-big-three",
                    "title": "The Big Three",
                    "summary": "Understand the Sun, Moon, and Ascendant as the emotional and symbolic center of chart interpretation.",
                    "locked": False,
                    "lessons": [
                        {"id": "lesson-sun", "title": "Reading the Sun", "lesson_type": "text", "duration": "12 min", "locked": False},
                        {"id": "lesson-moon", "title": "Reading the Moon", "lesson_type": "video", "duration": "18 min", "locked": False},
                        {"id": "lesson-rising", "title": "Reading the Ascendant", "lesson_type": "text", "duration": "14 min", "locked": False},
                    ],
                },
                {
                    "id": "module-chart-synthesis",
                    "title": "Chart Synthesis",
                    "summary": "Move from isolated placements into psychologically integrated chart reading.",
                    "locked": True,
                    "lessons": [
                        {"id": "lesson-elements", "title": "Elements and modalities", "lesson_type": "video", "duration": "22 min", "locked": True},
                        {"id": "lesson-aspects", "title": "Aspects as inner dialogue", "lesson_type": "text", "duration": "16 min", "locked": True},
                    ],
                },
            ],
        },
        {
            "id": "timing-and-transits",
            "title": "Timing, Transits, and Life Chapters",
            "description": "A premium placeholder course designed for transit interpretation, forecasting, and cyclical growth work.",
            "level": "Intermediate",
            "locked": True,
            "cover_theme": "Premium timing lab",
            "modules": [
                {
                    "id": "module-transits-101",
                    "title": "Transit Foundations",
                    "summary": "How the current sky activates natal placements and psychological timing.",
                    "locked": True,
                    "lessons": [
                        {"id": "lesson-forecasting", "title": "Ethical forecasting", "lesson_type": "text", "duration": "10 min", "locked": True},
                        {"id": "lesson-saturn-cycles", "title": "Saturn and long-form maturation", "lesson_type": "video", "duration": "26 min", "locked": True},
                    ],
                }
            ],
        },
    ],
}