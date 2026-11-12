"""Local development only; SQLite is an explicit temporary default."""
from django.core.management.utils import get_random_secret_key
from .base import *  # noqa: F403
from .environment import env_list

DEBUG = True
# No development key is committed. Without a supplied local key this changes
# across restarts, invalidating sessions. Supply a stable private key for login persistence.
SECRET_KEY = SECRET_KEY or get_random_secret_key()  # noqa: F405
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]")
CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)

CSRF_TRUSTED_ORIGINS = env_list(
    "DJANGO_CSRF_TRUSTED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
