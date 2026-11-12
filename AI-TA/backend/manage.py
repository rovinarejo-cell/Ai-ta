#!/usr/bin/env python
"""Development command entry point; use --settings for an explicit override."""
import os
import sys

if __name__ == "__main__":
    # Load configuration before choosing the settings module; OS variables win.
    from pathlib import Path
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
