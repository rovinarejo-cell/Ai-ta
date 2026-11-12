"""Synthetic accounts in Django's isolated test DB; real CSRF checks stay enabled."""
import io
from secrets import token_urlsafe
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.permissions import IsAdministrator, IsTeacher

User = get_user_model()


class AccountModelTests(TestCase):
    def test_teacher_creation_normalization_hash_and_timestamps(self):
        password = token_urlsafe(28)
        user = User.objects.create_user(" Teacher@Example.TEST ", password)
        self.assertEqual(user.email, "teacher@example.test")
        self.assertEqual(user.role, "teacher")
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertNotEqual(user.password, password)
        self.assertTrue(user.password.startswith("pbkdf2_sha256$"))
        self.assertTrue(user.check_password(password))
        self.assertIsNotNone(user.date_joined)
        self.assertIsNotNone(user.updated_at)

    def test_duplicate_email_and_case_variant_rejected(self):
        User.objects.create_user("teacher@example.test", token_urlsafe(28))
        for email in ("teacher@example.test", "TEACHER@EXAMPLE.TEST"):
            with self.subTest(email=email), self.assertRaises(ValidationError):
                User.objects.create_user(email, token_urlsafe(28))
        # The database also enforces uniqueness if manager validation is bypassed.
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create(email="TEACHER@EXAMPLE.TEST", password="!unusable")

    def test_email_and_password_validation(self):
        for email in ("", "not-an-address", "missing@"):
            with self.subTest(email=email), self.assertRaises(ValidationError):
                User.objects.create_user(email, token_urlsafe(28))
        for password in (None, "", "short", "password", "9876543210987654321", "teacher@example.test"):
            with self.subTest(kind="invalid password"), self.assertRaises(ValidationError):
                User.objects.create_user("teacher@example.test", password)
        self.assertEqual(User.objects.count(), 0)

    def test_administrator_provisioning_and_role_constraints(self):
        admin = User.objects.create_superuser("administrator@example.test", token_urlsafe(28))
        self.assertEqual(admin.role, "administrator")
        self.assertTrue(admin.is_superuser and admin.is_staff)
        with self.assertRaises(ValueError):
            User.objects.create_superuser("other@example.test", token_urlsafe(28), is_superuser=False)
        with self.assertRaises(ValidationError):
            User.objects.create_user("invalidrole@example.test", token_urlsafe(28), role="unnecessary-role")

    def test_private_teacher_command_prompts_and_creates_no_privileged_account(self):
        password = token_urlsafe(28)
        output = io.StringIO()
        with patch("apps.accounts.management.commands.create_teacher.getpass", side_effect=[password, password]):
            call_command("create_teacher", email="provisioned@example.test", stdout=output)
        user = User.objects.get(email="provisioned@example.test")
        self.assertEqual(user.role, "teacher")
        self.assertFalse(user.is_staff or user.is_superuser)
        self.assertTrue(user.check_password(password))
        self.assertNotIn(password, output.getvalue())


@override_settings(CSRF_TRUSTED_ORIGINS=["http://localhost:5173"], CORS_ALLOWED_ORIGINS=["http://localhost:5173"])
class SessionAuthenticationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.password = token_urlsafe(28)
        cls.teacher = User.objects.create_user("teacher@example.test", cls.password)
        cls.inactive = User.objects.create_user("inactive@example.test", cls.password, is_active=False)
        cls.admin = User.objects.create_superuser("administrator@example.test", cls.password)

    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)

    def csrf(self):
        response = self.client.get(reverse("v1:auth-csrf"))
        self.assertEqual(response.status_code, 200)
        return response.json()["csrfToken"]

    def login(self, email="teacher@example.test", password=None):
        return self.client.post(reverse("v1:auth-login"), {"email": email, "password": password or self.password}, format="json", HTTP_X_CSRFTOKEN=self.csrf())

    def test_login_returns_basic_account_and_http_only_session_cookie(self):
        response = self.login("TEACHER@EXAMPLE.TEST")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "teacher@example.test")
        self.assertTrue(response.cookies["sessionid"]["httponly"])
        self.assertEqual(response.cookies["sessionid"]["samesite"], "Lax")
        self.assertIn("no-store", response["Cache-Control"])
        self.teacher.refresh_from_db()
        self.assertIsNotNone(self.teacher.last_login)

    def test_protected_me_returns_only_own_basic_fields(self):
        self.assertEqual(self.login().status_code, 200)
        response = self.client.get(reverse("v1:auth-me"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"id", "email", "role", "is_active", "date_joined"})
        self.assertEqual(response.json()["id"], self.teacher.pk)
        self.assertIn("no-store", response["Cache-Control"])

    def test_unauthenticated_access_and_public_registration_are_rejected(self):
        self.assertEqual(self.client.get(reverse("v1:auth-me")).status_code, 403)
        for method in (self.client.get, self.client.post):
            self.assertEqual(method("/api/v1/auth/register/").status_code, 404)

    def test_wrong_password_unknown_email_and_inactive_have_same_response(self):
        responses = [self.login(password=token_urlsafe(28)), self.login("unknown@example.test"), self.login("inactive@example.test")]
        self.assertTrue(all(response.status_code == 400 for response in responses))
        self.assertEqual(responses[0].json(), responses[1].json())
        self.assertEqual(responses[1].json(), responses[2].json())
        self.assertNotIn("sessionid", self.client.cookies)

    def test_invalid_login_email_and_missing_password(self):
        for payload in ({"email": "invalid", "password": self.password}, {"email": "teacher@example.test"}):
            response = self.client.post(reverse("v1:auth-login"), payload, format="json", HTTP_X_CSRFTOKEN=self.csrf())
            self.assertEqual(response.status_code, 400)

    def test_login_requires_csrf_even_when_anonymous(self):
        payload = {"email": "teacher@example.test", "password": self.password}
        self.assertEqual(self.client.post(reverse("v1:auth-login"), payload, format="json").status_code, 403)
        self.csrf()
        self.assertEqual(self.client.post(reverse("v1:auth-login"), payload, format="json").status_code, 403)
        self.assertEqual(self.client.post(reverse("v1:auth-login"), payload, format="json", HTTP_X_CSRFTOKEN="incorrect").status_code, 403)

    def test_valid_csrf_cannot_bypass_origin_check(self):
        payload = {"email": "teacher@example.test", "password": self.password}
        response = self.client.post(reverse("v1:auth-login"), payload, format="json", HTTP_X_CSRFTOKEN=self.csrf(), HTTP_ORIGIN="https://untrusted.invalid")
        self.assertEqual(response.status_code, 403)
        response = self.client.post(reverse("v1:auth-login"), payload, format="json", HTTP_X_CSRFTOKEN=self.csrf(), HTTP_ORIGIN="http://localhost:5173")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Access-Control-Allow-Credentials"], "true")

    def test_login_rotates_session_and_csrf(self):
        session = self.client.session
        session["anonymous_marker"] = True
        session.save()
        self.client.cookies["sessionid"] = session.session_key
        previous_key = session.session_key
        previous_token = self.csrf()
        response = self.client.post(reverse("v1:auth-login"), {"email": "teacher@example.test", "password": self.password}, format="json", HTTP_X_CSRFTOKEN=previous_token)
        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(self.client.cookies["sessionid"].value, previous_key)
        self.assertFalse(Session.objects.filter(session_key=previous_key).exists())
        # The old pre-login CSRF token must not authorize logout.
        self.assertEqual(self.client.post(reverse("v1:auth-logout"), {}, format="json", HTTP_X_CSRFTOKEN=previous_token).status_code, 403)
        self.assertEqual(self.client.post(reverse("v1:auth-logout"), {}, format="json", HTTP_X_CSRFTOKEN=response.json()["csrfToken"]).status_code, 204)

    def test_logout_flushes_session_and_protected_access(self):
        response = self.login()
        key = self.client.cookies["sessionid"].value
        self.assertEqual(self.client.post(reverse("v1:auth-logout"), {}, format="json", HTTP_X_CSRFTOKEN=response.json()["csrfToken"]).status_code, 204)
        self.assertFalse(Session.objects.filter(session_key=key).exists())
        self.client.cookies["sessionid"] = key
        self.assertEqual(self.client.get(reverse("v1:auth-me")).status_code, 403)

    def test_logout_requires_csrf_and_cannot_use_get(self):
        self.login()
        self.assertEqual(self.client.post(reverse("v1:auth-logout"), {}, format="json").status_code, 403)
        self.assertEqual(self.client.get(reverse("v1:auth-logout")).status_code, 405)
        self.assertEqual(self.client.get(reverse("v1:auth-me")).status_code, 200)

    def test_deactivating_account_invalidates_protected_access(self):
        self.login()
        User.objects.filter(pk=self.teacher.pk).update(is_active=False)
        self.assertEqual(self.client.get(reverse("v1:auth-me")).status_code, 403)

    def test_administrator_and_teacher_permissions_are_distinct(self):
        teacher_request = SimpleNamespace(user=self.teacher)
        admin_request = SimpleNamespace(user=self.admin)
        self.assertTrue(IsTeacher().has_permission(teacher_request, None))
        self.assertFalse(IsAdministrator().has_permission(teacher_request, None))
        self.assertTrue(IsAdministrator().has_permission(admin_request, None))
        self.assertFalse(IsTeacher().has_permission(admin_request, None))
        self.assertFalse(IsTeacher().has_permission(SimpleNamespace(user=self.inactive), None))
        self.assertEqual(self.login("administrator@example.test").status_code, 200)
        self.assertEqual(self.client.get(reverse("v1:auth-me")).json()["role"], "administrator")

    def test_login_is_throttled(self):
        token = self.csrf()
        payload = {"email": "unknown@example.test", "password": self.password}
        for _ in range(10):
            self.assertEqual(self.client.post(reverse("v1:auth-login"), payload, format="json", HTTP_X_CSRFTOKEN=token).status_code, 400)
        self.assertEqual(self.client.post(reverse("v1:auth-login"), payload, format="json", HTTP_X_CSRFTOKEN=token, HTTP_X_FORWARDED_FOR="192.0.2.100").status_code, 429)

    @override_settings(SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True)
    def test_secure_cookie_flags_when_https_settings_enabled(self):
        csrf = self.client.get(reverse("v1:auth-csrf"), secure=True)
        self.assertTrue(csrf.cookies["csrftoken"]["secure"])
        self.assertTrue(csrf.cookies["csrftoken"]["httponly"])
        response = self.client.post(reverse("v1:auth-login"), {"email": "teacher@example.test", "password": self.password}, format="json", secure=True, HTTP_REFERER="https://testserver/", HTTP_X_CSRFTOKEN=csrf.json()["csrfToken"])
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.cookies["sessionid"]["secure"])


class ProductionSessionSettingsTests(SimpleTestCase):
    def settings_result(self, csrf_origin="https://frontend.example.invalid"):
        import json
        import os
        import subprocess
        import sys
        environment = {key: value for key, value in os.environ.items() if not key.startswith(("DJANGO_", "POSTGRES_", "DATABASE_"))}
        environment.update({"DATABASE_ENGINE": "postgresql", "POSTGRES_DB": "configuration_test_db", "POSTGRES_USER": "configuration_test_role", "POSTGRES_PASSWORD": token_urlsafe(24), "POSTGRES_HOST": "localhost", "POSTGRES_SSLMODE": "verify-full", "DJANGO_SECRET_KEY": token_urlsafe(64), "DJANGO_ALLOWED_HOSTS": "backend.example.invalid", "DJANGO_CSRF_TRUSTED_ORIGINS": csrf_origin})
        script = "import dotenv; dotenv.load_dotenv=lambda *a,**k:False; import config.settings.production as s; import json; print(json.dumps([s.SESSION_COOKIE_SECURE,s.CSRF_COOKIE_SECURE,s.SESSION_COOKIE_HTTPONLY,s.CSRF_COOKIE_HTTPONLY,s.SESSION_COOKIE_SAMESITE,s.DEBUG]))"
        return subprocess.run([sys.executable, "-c", script], env=environment, capture_output=True, text=True, check=False)

    def test_actual_production_cookie_configuration_without_database_connection(self):
        import json
        result = self.settings_result()
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout), [True, True, True, True, "Lax", False])

    def test_production_rejects_insecure_csrf_trusted_origins(self):
        result = self.settings_result("http://frontend.example.invalid")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Production CSRF trusted origins must use HTTPS", result.stderr)
