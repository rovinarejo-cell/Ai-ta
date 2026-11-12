"""Foundation-only tests: no domain records or database access required."""
import logging
import os
import subprocess
import sys

from django.apps import apps
from django.conf import settings
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework.response import Response
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework.views import APIView


@override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"])
class HealthTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_json_health_and_v1_namespace_without_database_access(self):
        self.assertEqual(reverse("v1:health"), "/api/v1/health/")
        response = self.client.get(reverse("v1:health"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(response.json(), {"status": "ok", "service": "ai-ta-backend", "version": "v1"})

    def test_health_ignores_session_cookie_without_database_access(self):
        self.client.cookies["sessionid"] = "synthetic-session-cookie"
        self.assertEqual(self.client.get(reverse("v1:health")).status_code, 200)

    def test_head_and_no_write_methods(self):
        self.assertEqual(self.client.head(reverse("v1:health")).status_code, 200)
        self.assertEqual(self.client.post(reverse("v1:health"), {}, format="json").status_code, 405)

    def test_unknown_api_version_and_unimplemented_records_return_404(self):
        for url in ("/api/v2/health/", "/api/v1/students/", "/api/v1/observations/", "/admin/"):
            self.assertEqual(self.client.get(url).status_code, 404)

    def test_vite_cors_and_preflight(self):
        for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
            response = self.client.get(reverse("v1:health"), HTTP_ORIGIN=origin)
            self.assertEqual(response["access-control-allow-origin"], origin)
        response = self.client.options(reverse("v1:health"), HTTP_ORIGIN="http://localhost:5173", HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["access-control-allow-origin"], "http://localhost:5173")

    def test_other_origins_are_not_allowed(self):
        response = self.client.get(reverse("v1:health"), HTTP_ORIGIN="https://unconfigured.invalid")
        self.assertNotIn("access-control-allow-origin", response)

    def test_unconfigured_api_views_fail_closed(self):
        class ReservedView(APIView):
            def get(self, request):
                return Response({"unexpected": True})
        response = ReservedView.as_view()(APIRequestFactory().get("/"))
        self.assertEqual(response.status_code, 403)

    def test_domain_apps_have_no_models_or_records(self):
        for name in ("students", "observations", "academics", "indicators", "recommendations", "curriculum", "progress", "analytics", "governance"):
            self.assertEqual(list(apps.get_app_config(name).get_models()), [])
        self.assertEqual(settings.AUTH_USER_MODEL, "accounts.User")
        self.assertEqual([model.__name__ for model in apps.get_app_config("accounts").get_models()], ["User"])
        self.assertEqual(settings.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"], ["rest_framework.authentication.SessionAuthentication"])

    def test_request_logging_omits_message_and_request_context(self):
        handler = logging.getLogger("django.request").handlers[0]
        record = logging.LogRecord("django.request", logging.ERROR, __file__, 1, "Do not log fictional learner names or request data", (), None)
        self.assertTrue(handler.filter(record))
        self.assertEqual(handler.format(record), "ERROR django.request")
        try:
            raise ValueError("Synthetic sensitive details must not reach logs")
        except ValueError:
            record = logging.LogRecord("django.request", logging.ERROR, __file__, 1, "Sensitive message", (), sys.exc_info())
        self.assertTrue(handler.filter(record))
        self.assertIsNone(record.exc_info)
        self.assertEqual(handler.format(record), "ERROR django.request")


class ProductionGuardTests(SimpleTestCase):
    def import_settings(self, overrides):
        environment = {**os.environ, **overrides}
        # The command never prints configuration or credentials.
        return subprocess.run([sys.executable, "-c", "import config.settings.production"], env=environment, capture_output=True, text=True, check=False)

    def test_production_refuses_missing_secret(self):
        result = self.import_settings({"DJANGO_SECRET_KEY": "", "DATABASE_ENGINE": "sqlite"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Set the DJANGO_SECRET_KEY", result.stderr)

    def test_production_refuses_sqlite_even_with_ephemeral_test_key(self):
        from django.core.management.utils import get_random_secret_key
        result = self.import_settings({"DJANGO_SECRET_KEY": get_random_secret_key(), "DATABASE_ENGINE": "sqlite"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Production requires DATABASE_ENGINE=postgresql", result.stderr)
