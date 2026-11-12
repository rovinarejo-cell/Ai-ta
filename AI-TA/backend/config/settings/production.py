"""Production configuration contract only; this task does not deploy it."""
from django.core.exceptions import ImproperlyConfigured
from .base import *  # noqa: F403
from .environment import required

DEBUG = False
SECRET_KEY = required("DJANGO_SECRET_KEY")
if len(SECRET_KEY) < 50 or len(set(SECRET_KEY)) < 5:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be a strong externally supplied key.")
if DATABASE_ENGINE != "postgresql":  # noqa: F405
    raise ImproperlyConfigured("Production requires DATABASE_ENGINE=postgresql; SQLite is development-only.")
if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:  # noqa: F405
    raise ImproperlyConfigured("Set explicit DJANGO_ALLOWED_HOSTS in production.")
if any(not origin.startswith("https://") for origin in CORS_ALLOWED_ORIGINS):  # noqa: F405
    raise ImproperlyConfigured("Production CORS origins must use HTTPS.")
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
CSRF_COOKIE_SECURE = True
# Do not trust forwarded headers without a separately reviewed trusted proxy.
if DATABASES["default"]["OPTIONS"]["sslmode"] != "verify-full":  # noqa: F405
    raise ImproperlyConfigured("Production PostgreSQL requires POSTGRES_SSLMODE=verify-full.")
