"""Configuration tests use synthetic environment values, not a live PostgreSQL server."""
import importlib
import json
import os
import subprocess
import sys
from pathlib import Path
from secrets import token_urlsafe
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase
from config.settings.environment import database_configuration


class DatabaseSelectionTests(SimpleTestCase):
    def fixture(self):
        return {
            "DATABASE_ENGINE": "postgresql",
            "POSTGRES_DB": "configuration_test_db",
            "POSTGRES_USER": "configuration_test_role",
            "POSTGRES_PASSWORD": token_urlsafe(24),
            "POSTGRES_HOST": "localhost",
        }

    def configure(self, environment):
        with patch.dict(os.environ, environment, clear=True):
            return database_configuration(Path('/temporary/backend'))

    def test_no_configuration_defaults_to_sqlite(self):
        engine, databases = self.configure({})
        self.assertEqual(engine, "sqlite")
        self.assertEqual(databases["default"]["ENGINE"], "django.db.backends.sqlite3")
        self.assertEqual(databases["default"]["NAME"], Path('/temporary/backend/db.sqlite3'))

    def test_explicit_or_blank_sqlite_selection_does_not_use_partial_postgres_values(self):
        for engine in ("sqlite", "", "   "):
            with self.subTest(engine=engine):
                selected, _ = self.configure({"DATABASE_ENGINE": engine, "POSTGRES_HOST": "localhost"})
                self.assertEqual(selected, "sqlite")
        self.assertEqual(self.configure({"POSTGRES_HOST": "localhost"})[0], "sqlite")

    def test_postgres_fields_and_port_are_mapped_from_environment(self):
        environment = {**self.fixture(), "POSTGRES_PORT": "5544"}
        engine, databases = self.configure(environment)
        self.assertEqual(engine, "postgresql")
        config = databases["default"]
        self.assertEqual(config["ENGINE"], "django.db.backends.postgresql")
        for target, source in (("NAME", "POSTGRES_DB"), ("USER", "POSTGRES_USER"), ("PASSWORD", "POSTGRES_PASSWORD"), ("HOST", "POSTGRES_HOST"), ("PORT", "POSTGRES_PORT")):
            self.assertEqual(config[target], environment[source])
        self.assertEqual(config["OPTIONS"], {"sslmode": "verify-full", "connect_timeout": 5})

    def test_missing_empty_or_whitespace_required_postgres_fields_fail(self):
        for field in ("POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_HOST"):
            for value in (None, "", "   "):
                environment = self.fixture()
                if value is None:
                    del environment[field]
                else:
                    environment[field] = value
                with self.subTest(field=field, value=value), self.assertRaisesMessage(ImproperlyConfigured, field):
                    self.configure(environment)

    def test_password_is_not_trimmed_or_interpolated(self):
        environment = self.fixture()
        environment["POSTGRES_PASSWORD"] = " " + token_urlsafe(24) + " $not_a_variable "
        self.assertEqual(self.configure(environment)[1]["default"]["PASSWORD"], environment["POSTGRES_PASSWORD"])

    def test_missing_or_blank_port_defaults_to_5432(self):
        for value in (None, "", "   "):
            environment = self.fixture()
            if value is not None:
                environment["POSTGRES_PORT"] = value
            self.assertEqual(self.configure(environment)[1]["default"]["PORT"], "5432")

    def test_invalid_port_is_rejected_without_echoing_value(self):
        for value in ("0", "65536", "abc", "54.32", "-1", "１２３"):
            with self.subTest(value=value), self.assertRaisesMessage(ImproperlyConfigured, "POSTGRES_PORT must be an integer"):
                self.configure({**self.fixture(), "POSTGRES_PORT": value})

    def test_unknown_engine_cannot_silently_fall_back(self):
        with self.assertRaisesMessage(ImproperlyConfigured, "DATABASE_ENGINE must be"):
            self.configure({"DATABASE_ENGINE": "unsupported"})

    def test_sslmode_validation_and_development_override(self):
        self.assertEqual(self.configure({**self.fixture(), "POSTGRES_SSLMODE": "disable"})[1]["default"]["OPTIONS"]["sslmode"], "disable")
        self.assertEqual(self.configure({**self.fixture(), "POSTGRES_SSLMODE": ""})[1]["default"]["OPTIONS"]["sslmode"], "verify-full")
        with self.assertRaisesMessage(ImproperlyConfigured, "POSTGRES_SSLMODE"):
            self.configure({**self.fixture(), "POSTGRES_SSLMODE": "invalid"})

    def test_installed_django_backend_imports_psycopg_3(self):
        import psycopg
        backend = importlib.import_module("django.db.backends.postgresql.base")
        self.assertIs(backend.Database, psycopg)
        self.assertEqual(psycopg.__version__.split('.')[0], '3')

    def test_settings_import_selects_postgres_without_connecting(self):
        environment = self.fixture()
        environment["DJANGO_SETTINGS_MODULE"] = "config.settings.development"
        with patch.dict(os.environ, environment, clear=True):
            config = self.run_settings(environment, "config.settings.development")
        self.assertEqual(config.returncode, 0)
        self.assertEqual(json.loads(config.stdout)["engine"], "django.db.backends.postgresql")

    def run_settings(self, values, module):
        environment = {key: value for key, value in os.environ.items() if not key.startswith(("POSTGRES_", "DATABASE_", "DJANGO_"))}
        environment.update(values)
        # Isolate local .env contents; never connect or print configuration secrets.
        script = ("import dotenv; dotenv.load_dotenv = lambda *a, **k: False; "
                  f"import importlib,json; s=importlib.import_module('{module}'); "
                  "print(json.dumps({'engine':s.DATABASES['default']['ENGINE'],'debug':s.DEBUG}))")
        return subprocess.run([sys.executable, "-c", script], env=environment, capture_output=True, text=True, check=False)

    def production_fixture(self):
        return {**self.fixture(), "DJANGO_SECRET_KEY": token_urlsafe(64), "DJANGO_ALLOWED_HOSTS": "research.example.invalid"}

    def test_production_postgres_settings_load_but_this_is_not_a_connection_test(self):
        result = self.run_settings(self.production_fixture(), "config.settings.production")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout), {"engine": "django.db.backends.postgresql", "debug": False})

    def test_production_without_postgres_selection_is_rejected(self):
        for selected in (None, "sqlite"):
            environment = self.production_fixture()
            if selected is None:
                environment.pop("DATABASE_ENGINE")
            else:
                environment["DATABASE_ENGINE"] = selected
            result = self.run_settings(environment, "config.settings.production")
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Production requires DATABASE_ENGINE=postgresql", result.stderr)

    def test_production_missing_postgres_configuration_is_rejected(self):
        environment = self.production_fixture()
        del environment["POSTGRES_PASSWORD"]
        result = self.run_settings(environment, "config.settings.production")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("POSTGRES_PASSWORD", result.stderr)

    def test_production_rejects_disabled_postgres_tls_verification(self):
        result = self.run_settings({**self.production_fixture(), "POSTGRES_SSLMODE": "disable"}, "config.settings.production")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Production PostgreSQL requires POSTGRES_SSLMODE=verify-full", result.stderr)
