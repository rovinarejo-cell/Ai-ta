import os
from pathlib import Path
from dotenv import load_dotenv
from django.core.wsgi import get_wsgi_application

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
# Server entry points default to production, never debug development settings.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
application = get_wsgi_application()
