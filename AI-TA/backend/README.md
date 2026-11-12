# V0.5.3 Teacher authentication and role foundations

This separate Django + Django REST Framework project provides health and private teacher/admin session-authentication endpoints. The existing React/TypeScript/Vite frontend remains independent and continues using its local mock/session data. Nothing is migrated from the browser. There are no learner models/records, learner APIs, public registration, backend recommendation rules, ML, frontend authentication integration, or deployment in this stage.

Use Python **3.12** (the tested version) and two terminals: one for Django and one for the existing Vite frontend. Dependencies are pinned in `requirements.txt`.

## Windows local development

Open a terminal in the existing `AI-TA` directory containing `package.json`. These PowerShell commands use the virtual environment's Python directly, avoiding activation-policy issues:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Copy `.env.example` only when `.env` does not already exist; preserve any existing local configuration. The example has no credentials. Development defaults to a temporary SQLite database and generates an ephemeral secret key when none is supplied. The key changes on restart; authentication sessions are invalidated when that key changes. Supply a stable private key for login persistence across server restarts. A stable key may be supplied privately in local environment configuration.

## Linux/macOS local development

From `AI-TA`:

```sh
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
# Only when there is no existing local .env:
cp -n .env.example .env
.venv/bin/python manage.py migrate
.venv/bin/python manage.py check
.venv/bin/python manage.py runserver 127.0.0.1:8000
```

In the Codex cloud workspace, the backend is `/workspace/Ai-ta/AI-TA/backend`; if pip's default cache is unwritable, add `--cache-dir /tmp/ai-ta-pip-cache` to installation. This onboarding UI does not provide a public localhost preview. The development server binds to loopback only; it is not a deployed application.

`migrate` initializes Django's contenttypes/auth/session tables and the custom accounts.User schema. Non-account domain apps have no models/migrations, and no teacher or learner records are seeded. The health endpoint works without database tables and is intentionally not a database-readiness check.

## Health endpoint

Open **http://127.0.0.1:8000/api/v1/health/** locally:

```json
{"status":"ok","service":"ai-ta-backend","version":"v1"}
```

It supports GET/HEAD/OPTIONS. POST is not supported. The namespace is `v1:health` and DRF uses namespace versioning. There is no v2, Django admin-site route, student route, or observation route. V0.5.3 login/logout routes are documented below. A 200 response establishes API liveness, **not PostgreSQL connectivity**.

To check from PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/
```

## Existing frontend — second terminal

Open a second terminal in the existing `AI-TA` folder, leaving Django running:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173. No frontend API client, environment changes, or workflow changes are introduced. CORS permits the configured frontend origin for future integration; it does not make the frontend use Django automatically. If Vite selects a different port, set that exact origin in `DJANGO_CORS_ALLOWED_ORIGINS` and restart Django.

## Structure and application boundaries

```text
backend/
  manage.py
  requirements.txt
  .env.example
  README.md
  config/
    settings/
      base.py
      environment.py
      development.py
      production.py
    api/v1/urls.py
    urls.py
    asgi.py
    wsgi.py
  apps/
    accounts/         # custom user, private provisioning, session auth, permissions
    students/         # no learner models or records
    observations/
    academics/
    indicators/
    recommendations/  # no duplicated recommendation implementation
    curriculum/
    progress/
    analytics/
    governance/       # health view, route, and foundation tests
```

Every app has an AppConfig. The accounts app now defines the custom user and private authentication serializers/views. Django auth, contenttypes, and database-backed sessions are installed; admin-site and token/JWT functionality are not. Learner models, CRUD, and record-level authorization remain deferred. DRF uses SessionAuthentication and defaults to IsAuthenticated; health and CSRF/login explicitly allow anonymous access, with CSRF required for login.

## Configuration

Settings read `backend/.env` using python-dotenv; actual process environment values take precedence. `.env`, virtual environments, database files, Python caches, and logs are ignored by Git. Never add passwords, private keys, or real learner information to tracked files.

| Variable | Development default / meaning |
| --- | --- |
| `DJANGO_SETTINGS_MODULE` | `config.settings.development` for management commands |
| `DJANGO_SECRET_KEY` | Empty locally generates an ephemeral key; strong external key required in production |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1,[::1]` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Development example trusts the two explicit Vite origins; production must configure HTTPS origins |
| `DATABASE_ENGINE` | `sqlite` temporarily; explicitly select `postgresql` when configured |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` | Required when selecting PostgreSQL; provide securely, never in tracked files |
| `POSTGRES_PORT` | Unset/empty defaults to `5432`; otherwise integer `1–65535` |
| `POSTGRES_SSLMODE` | `verify-full`; production enforces certificate/hostname verification |
| `PGSSLROOTCERT` | Optional libpq trusted CA certificate path, when required by the PostgreSQL server |

SQLite is for temporary development only. PostgreSQL is the intended production ORM backend. Installing psycopg does not install or provision a PostgreSQL server. Once an authorized server and private configuration exist, select `DATABASE_ENGINE=postgresql`; failed PostgreSQL connections never silently fall back to SQLite. For an explicitly selected local-only PostgreSQL instance without TLS, development may use `POSTGRES_SSLMODE=disable`; production refuses that setting. No PostgreSQL connection has been verified in this foundation environment.

## Development versus production

- `development.py`: debug enabled, loopback host/origin defaults, temporary SQLite allowed, ephemeral local key fallback.
- `production.py`: debug disabled, strong external secret and explicit host allowlist required, PostgreSQL required, HTTPS-only CORS origins and PostgreSQL `verify-full` required; HTTPS redirect, secure CSRF cookie and HSTS enabled.
- ASGI/WSGI entry points default to production if no settings module is supplied. `manage.py` defaults to development. Never deploy a development `.env`; set `DJANGO_SETTINGS_MODULE=config.settings.production` explicitly in the deployment environment in a future deployment stage.
- No proxy-forwarded headers are trusted automatically. Proxy/TLS handling, production server/process management, authorization design, shared throttling, and database connectivity must be separately reviewed before deployment. This is a configuration foundation, not a production-readiness claim.
- No wildcard CORS is enabled. Credentialed requests are permitted only for the explicit origin allowlist. CORS is not authorization. Health is public and contains no research data; learner-record APIs do not exist.
- Foundation logs omit request payloads, URLs, headers, identifiers, messages, and traceback details. This deliberately limits diagnostics until a reviewed privacy-preserving logging policy exists. Debug development pages are local-only; do not enter real research data.

## Validation

From `backend`, using your virtual environment's Python:

```sh
.venv/bin/python manage.py check
.venv/bin/python manage.py test --verbosity 2
.venv/bin/python -m pip check
```

On Windows replace `.venv/bin/python` with `.\.venv\Scripts\python.exe`. Backend tests cover JSON health without database access, allowed methods/versioning, absent learner routes/models, Vite CORS/preflight, blocked unknown origins, default-denied API views, sanitized logging, SQLite/PostgreSQL selection, required PostgreSQL fields and port validation, driver compatibility, and production settings guards. They create no learner records and do not test PostgreSQL.

From `AI-TA`, existing frontend validation remains:

```sh
npm run typecheck
npm run build
npm test
```

Current-instance validation: Python 3.12, temporary SQLite connection and built-in contenttypes migrations, Django system checks, foundation tests, pip dependency consistency, a real HTTP health/CORS request, and the existing frontend checks. PostgreSQL and deployed production operation are **not** validated.

## V0.5.2 — PostgreSQL local setup and connection verification

### Prerequisites

Install a currently maintained PostgreSQL server (recommended PostgreSQL 16 or newer) and the `psql` client from [PostgreSQL downloads](https://www.postgresql.org/download/). Django 5.2 supports PostgreSQL 14+; choose a maintained release rather than installing an end-of-life version. On Windows, use the official download page's installer and include PostgreSQL Server and Command Line Tools. Start the installed PostgreSQL service through Windows Services. SQL Shell (psql) works even if the PostgreSQL `bin` folder is not in PATH. On Linux/macOS, use your operating system's PostgreSQL packages and start the service according to the package instructions.

You need an authorized database administrator connection to create an application database/role, the server's reachable hostname and port, and its TLS trust configuration if remote. A hosted database may already provide a database and role; use those authorized settings instead of creating duplicates. The Python `psycopg` dependency is only the driver, not the server.

The existing pins are compatible: Python 3.12, Django 5.2.19 and psycopg 3.3.8. The installed Django PostgreSQL backend imports that psycopg driver successfully. This verifies driver compatibility, not a PostgreSQL connection. No new Python dependency is needed for this stage.

### Create a dedicated application database

Open SQL Shell (psql) on Windows, or run this in a terminal with `psql` available. Use your actual authorized administrator role if it differs from `postgres`; `-W` prompts for the administrator password rather than placing it in the command:

```sh
psql -h localhost -p 5432 -U postgres -d postgres -W
```

Inside psql, create a non-superuser application role and its database. These are example **database/role names**, not learner records or Django authentication accounts:

```sql
CREATE ROLE ai_ta_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password ai_ta_app
CREATE DATABASE ai_ta OWNER ai_ta_app;
\q
```

`\password` securely prompts for the application-role password. Do not write a real password into SQL examples, command-line arguments, source files, chat, or Git. Choose different database/role names if these already exist; do not drop or overwrite existing databases. The database owner has the privileges needed for Django's current built-in migrations. Do not use the administrator role as the application login.

### Configure PostgreSQL explicitly

Create `backend/.env` from `.env.example` only if it does not already exist. Keep `DJANGO_SETTINGS_MODULE=config.settings.development` for local work. Change these values privately in `.env`:

```dotenv
DATABASE_ENGINE=postgresql
POSTGRES_DB=ai_ta
POSTGRES_USER=ai_ta_app
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_SSLMODE=verify-full
```

Set `POSTGRES_PASSWORD` privately to the value chosen through `\password`; the tracked example deliberately leaves it empty. The four fields DB, USER, PASSWORD and HOST are required for PostgreSQL. Port is read from `POSTGRES_PORT`; absent/empty means `5432`. Invalid ports, unsupported engines, invalid SSL modes, or missing required fields raise configuration errors naming the variable without printing its value.

For a TLS-enabled server, supply the appropriate trusted certificate through libpq's `PGSSLROOTCERT` when needed. The host must match the certificate for `verify-full`. Configure trust correctly rather than bypassing verification. Only for a deliberately local development server configured **without TLS**, use `POSTGRES_SSLMODE=disable`; production refuses that setting. Never make that change to bypass a remote/production certificate error.

Environment variables already set in your terminal take precedence over `.env`. If an edit seems ineffective, check the variable's presence and clear the stale terminal setting; do not dump credentials. `DATABASE_ENGINE` is the only selection switch: PostgreSQL variables alone do not enable PostgreSQL, so stored partial settings cannot unexpectedly change the development database.

### Run migrations and verify an actual connection

From `AI-TA/backend`, with PostgreSQL selected and configured, use your virtual environment's Python. Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py migrate --noinput
.\.venv\Scripts\python.exe manage.py migrate --check
.\.venv\Scripts\python.exe manage.py shell -c "from django.db import connection; connection.ensure_connection(); assert connection.vendor == 'postgresql'; cursor = connection.cursor(); cursor.execute('SELECT 1'); assert cursor.fetchone() == (1,); print('PostgreSQL connection and SELECT 1 verified.')"
```

Linux/macOS equivalents:

```sh
.venv/bin/python manage.py check
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py migrate --check
.venv/bin/python manage.py shell -c "from django.db import connection; connection.ensure_connection(); assert connection.vendor == 'postgresql'; cursor = connection.cursor(); cursor.execute('SELECT 1'); assert cursor.fetchone() == (1,); print('PostgreSQL connection and SELECT 1 verified.')"
```

Only the successful connection/SQL command establishes connectivity. `check` can pass without connecting; health remains an API-liveness endpoint and deliberately does not check the database. `migrate --check` verifies that migrations are applied in the selected database. Current migrations create Django auth/contenttypes/session metadata and the custom accounts schema. They do not seed teacher accounts, learner records, or frontend data.

If connection fails, investigate server/service availability, hostname/port, firewall/network access, role/database permissions, password configuration, and certificate trust. Keep the selected engine as PostgreSQL while diagnosing; there is no fallback on connection failure. Avoid sharing raw connection exceptions publicly since they may contain server/role metadata. Do not print full `DATABASES` settings or environment values.

### Switch between SQLite and PostgreSQL

Stop Django, set `DATABASE_ENGINE=sqlite` in the private `.env`, clear any conflicting terminal override, and restart for temporary SQLite development. Existing PostgreSQL variables can remain privately configured; they are ignored while SQLite is selected. Re-run migrations in the selected database if it has not yet been initialized.

For a one-terminal override on Windows:

```powershell
$env:DATABASE_ENGINE = "sqlite"
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
# After stopping runserver, remove the override to use .env again:
Remove-Item Env:DATABASE_ENGINE
```

For a one-command override on Linux/macOS:

```sh
DATABASE_ENGINE=sqlite .venv/bin/python manage.py check
DATABASE_ENGINE=sqlite .venv/bin/python manage.py runserver 127.0.0.1:8000
```

To return to PostgreSQL, explicitly select `DATABASE_ENGINE=postgresql` and provide all required private configuration. Switching engines does **not** move or copy records, migrations, or SQLite files between databases. The frontend workflow and browser-session data are unaffected.

Production must explicitly select PostgreSQL and pass the existing strong-secret, explicit-host, HTTPS/CORS and `verify-full` checks. It never silently defaults to SQLite. Production settings import tests use synthetic configuration and do not connect to a server; they are not production-readiness or connectivity claims.

### Verification in this workspace

No PostgreSQL client/server installation, local socket directory, local listener at `127.0.0.1:5432`, or configured PostgreSQL connection variables were available. Therefore PostgreSQL connectivity and PostgreSQL migrations were **not tested**. No server was provisioned, no credentials were requested or invented, and no connection success is claimed. SQLite checks/health, the full backend test suite, dependency consistency, and frontend checks are validated separately. Once an authorized PostgreSQL instance is supplied, run the migration/connection commands above.

## V0.5.3 — Teacher authentication

### Custom user and migration implications

Inspection found no AUTH_USER_MODEL, no accounts models/migrations, and only contenttypes migrations applied to the local SQLite database. There was no auth_user table or existing teacher data. `AUTH_USER_MODEL=accounts.User` is now configured before the accounts app's first migration, `accounts/0001_initial.py`. User uses AbstractBaseUser + PermissionsMixin, unique normalized lowercase email as USERNAME_FIELD, built-in PBKDF2 password hashing, teacher/administrator roles, active status, date_joined, updated_at, and last_login. Both field uniqueness and a database Lower(email) unique constraint reject case variants.

The accounts initial migration depends on Django's auth permission/group metadata; the swappable default auth.User table is not created. Django's sessions table is also added. Existing contenttypes data is preserved. No database is deleted/reset and no accounts are seeded. Before applying to another installation, back up its database and inspect migration history. If another database already contains auth_user or dependent migrations/data, do not reset it or blindly switch user models: it requires a separately reviewed migration/data-preservation plan.

After backing up, from backend:

```sh
.venv/bin/python manage.py migrate --plan
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py makemigrations --check --dry-run
```

Use `.\.venv\Scripts\python.exe` in Windows PowerShell instead of `.venv/bin/python`. SQLite/PostgreSQL selection and required PostgreSQL/TLS settings are unchanged. PostgreSQL migrations and connectivity remain untested in this workspace.

### Account creation — private only

There is no registration API in any environment, and `/api/v1/auth/register/` returns 404. For this staged research prototype, the operator provisions approved participants privately. Do not enter real teacher/learner information during prototype validation.

```sh
# Prompts for email and hidden password/confirmation; no password CLI flag.
.venv/bin/python manage.py create_teacher
# Separate private administrator provisioning; no public admin website is enabled.
.venv/bin/python manage.py createsuperuser
```

Password validation requires at least 12 characters and rejects common, entirely numeric, or overly similar passwords. Validation also runs in the custom manager used by provisioning; passwords are never stored as plaintext. There are only two roles, teacher and administrator. IsTeacher and IsAdministrator are reusable active-account permission classes. Role access does not yet provide learner ownership/school boundaries: those must be designed before learner endpoints exist. No API permits role escalation, account listing, registration, or password reset in this stage.

### API contract

All paths below are under `/api/v1/auth/`:

| Method/path | Access and result |
| --- | --- |
| GET `csrf/` | Anonymous; establishes HTTP-only CSRF cookie and returns a masked `csrfToken` |
| POST `login/` | Requires CSRF cookie/header and trusted origin; JSON email/password; returns basic `user` and rotated `csrfToken`; sets HTTP-only session cookie |
| GET `me/` | Protected test endpoint for active teacher/administrator; only id, email, role, is_active, date_joined |
| POST `logout/` | Authenticated and CSRF-protected; flushes server session, clears session cookie; HTTP 204 |

Missing authentication returns 403 with DRF SessionAuthentication. Wrong/unknown/inactive credentials share a generic 400 response. Invalid email or missing password returns 400; missing/invalid CSRF or untrusted origin returns 403. Login throttling returns 429 after ten attempts per socket peer address per minute; untrusted X-Forwarded-For headers are ignored. GET login/logout is not a state-changing shortcut (405). No bearer token or session identifier is returned in JSON. Responses are non-cacheable. Only the session ID in its cookie authenticates a client; `csrfToken` is not an authentication token.

SessionAuthentication is used by default. Login has explicit csrf_protect because anonymous DRF session authentication alone does not enforce CSRF. Logout has both the session CSRF check and explicit protection. Django rotates the session ID/CSRF secret on login and flushes the session on logout. Inactive accounts are rejected by the authentication backend and permission checks, including after an already logged-in user is deactivated.

### Browser/client usage (documentation only; React is unchanged)

Use the same hostname for the two local servers (localhost with localhost, or 127.0.0.1 with 127.0.0.1). These are same-site despite different ports. Cross-site deployment requires a separate cookie/CORS/CSRF review; do not set SameSite=None or disable CSRF merely to make it work.

The following JavaScript is an example API-client flow, not an added frontend integration. Supply synthetic account credentials privately; no credentials are hardcoded:

```javascript
async function teacherSessionExample(email, password) {
  const base = 'http://localhost:8000/api/v1/auth';
  const csrfResponse = await fetch(`${base}/csrf/`, { credentials: 'include' });
  const { csrfToken } = await csrfResponse.json();
  const loginResponse = await fetch(`${base}/login/`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
    body: JSON.stringify({ email, password }),
  });
  if (!loginResponse.ok) throw new Error('Login failed');
  const login = await loginResponse.json();
  const me = await fetch(`${base}/me/`, { credentials: 'include' });
  // Use the new token: the pre-login token is invalid after login rotation.
  const logoutResponse = await fetch(`${base}/logout/`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': login.csrfToken },
    body: '{}',
  });
  if (!logoutResponse.ok) throw new Error('Logout failed');
  return me.ok;
}
```

Both session and CSRF cookies are HTTP-only. Clients read the masked CSRF token from the API response, never the session cookie. On a client reload, GET csrf/ to obtain a fresh masked token for the current session. Session cookies use SameSite=Lax, host-only defaults, a one-hour lifetime, and browser-close expiry. Production enforces Secure cookies for both CSRF and session; local HTTP development intentionally does not set Secure. No localStorage/sessionStorage authentication tokens are introduced.

### Configuration and limitations

Provide a stable randomly generated DJANGO_SECRET_KEY privately for persistent sessions across processes/restarts. The development ephemeral-key fallback is for throwaway single-process use only: restarts invalidate login, and multiple workers will not share a key. Production already requires a strong external key. Never commit the key, passwords, session cookies, or CSRF tokens. Environment examples contain no credentials.

CORS credentials are enabled for explicit allowed origins only; no wildcard is enabled. Configure DJANGO_CSRF_TRUSTED_ORIGINS separately to the trusted frontend origin(s). Production expects HTTPS; the local development example is not a deployment configuration. Request/body/exception-detail logging remains sanitized. There is no learner data API.

The login throttle uses the existing Django local-memory cache: it is a single-process development safeguard, not a distributed abuse-prevention guarantee. Shared-cache rate limiting, trusted proxy/IP handling, HTTPS deployment validation, password recovery/invitations, session operations/clearsessions scheduling, privacy governance, audit design, and account/learner ownership rules need review before production. No security certification is claimed. No MFA or public registration is provided.

### Authentication tests

Tests use synthetic `.test` email addresses, random test passwords, an isolated SQLite test database, Django's real password hashing, and APIClient(enforce_csrf_checks=True). They cover account creation, email/case duplicates (including database enforcement), invalid email/password, private provisioning, roles, successful/failed/inactive login, protected own-account access, CSRF/origin failures, session/CSRF rotation, logout invalidation, cookie flags, cache-control, and throttling. Existing health, configuration, and frontend tests remain part of validation. These tests do not establish deployed-production or PostgreSQL security.
