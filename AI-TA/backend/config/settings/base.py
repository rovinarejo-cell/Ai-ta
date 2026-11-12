"""Shared ORM/API configuration. Select development or production explicitly."""
import os
from pathlib import Path
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured
from .environment import database_configuration, env_list

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env", override=False)
DEBUG = False
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "rest_framework",
    "corsheaders",
    "apps.accounts.apps.AccountsConfig",
    "apps.students.apps.StudentsConfig",
    "apps.observations.apps.ObservationsConfig",
    "apps.academics.apps.AcademicsConfig",
    "apps.indicators.apps.IndicatorsConfig",
    "apps.recommendations.apps.RecommendationsConfig",
    "apps.curriculum.apps.CurriculumConfig",
    "apps.progress.apps.ProgressConfig",
    "apps.analytics.apps.AnalyticsConfig",
    "apps.governance.apps.GovernanceConfig",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# SQLite remains the default; PostgreSQL is selected only by DATABASE_ENGINE.
DATABASE_ENGINE, DATABASES = database_configuration(BASE_DIR)

REST_FRAMEWORK = {
    "DEFAULT_VERSIONING_CLASS": "rest_framework.versioning.NamespaceVersioning",
    "DEFAULT_VERSION": "v1",
    "ALLOWED_VERSIONS": ["v1"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    # Authentication is intentionally not implemented. New endpoints fail closed;
    # only the health view explicitly permits anonymous requests.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "UNAUTHENTICATED_USER": None,
    "UNAUTHENTICATED_TOKEN": None,
}
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = False
CORS_URLS_REGEX = r"^/api/v1/.*$"
CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
# Foundation logging omits message/request/exception details so future payloads,
# URLs, identifiers, credentials, or learner information are not logged here.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"minimal": {"format": "%(levelname)s %(name)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "minimal"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        name: {"handlers": ["console"], "level": "WARNING", "propagate": False}
        for name in ("django", "django.server", "django.request", "django.security")
    },
}
