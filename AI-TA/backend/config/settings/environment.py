"""Small configuration helpers; never print configuration values."""
import os
from django.core.exceptions import ImproperlyConfigured


def env_list(name, default=""):
    return [value.strip() for value in os.getenv(name, default).split(",") if value.strip()]


def required(name):
    value = os.getenv(name, "")
    if not value.strip():
        raise ImproperlyConfigured(f"Set the {name} environment variable.")
    return value


def database_configuration(base_dir):
    """Explicit selection only; connection errors never change the selected engine."""
    engine = os.getenv("DATABASE_ENGINE", "sqlite").strip().lower() or "sqlite"
    if engine == "sqlite":
        return engine, {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": base_dir / "db.sqlite3",
            }
        }
    if engine != "postgresql":
        raise ImproperlyConfigured("DATABASE_ENGINE must be sqlite or postgresql.")

    # A password is returned exactly as supplied; strip only non-secret fields.
    name = required("POSTGRES_DB").strip()
    user = required("POSTGRES_USER").strip()
    password = required("POSTGRES_PASSWORD")
    host = required("POSTGRES_HOST").strip()
    port = os.getenv("POSTGRES_PORT", "5432").strip() or "5432"
    if not port.isascii() or not port.isdecimal() or not 1 <= int(port) <= 65535:
        raise ImproperlyConfigured("POSTGRES_PORT must be an integer from 1 to 65535.")
    sslmode = os.getenv("POSTGRES_SSLMODE", "verify-full").strip() or "verify-full"
    if sslmode not in {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"}:
        raise ImproperlyConfigured("POSTGRES_SSLMODE must be a supported libpq SSL mode.")
    return engine, {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": name,
            "USER": user,
            "PASSWORD": password,
            "HOST": host,
            "PORT": str(int(port)),
            "OPTIONS": {"sslmode": sslmode, "connect_timeout": 5},
        }
    }
