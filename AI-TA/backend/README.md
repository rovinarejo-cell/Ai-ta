# V0.5.2 PostgreSQL configuration and verification

This separate Django + Django REST Framework project provides only an API liveness endpoint. The existing React/TypeScript/Vite frontend remains independent and continues using its local mock/session data. Nothing is migrated from the browser. There are no learner models or records, authentication endpoints, domain APIs, backend recommendation rules, ML, or deployment in this stage.

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

Copy `.env.example` only when `.env` does not already exist; preserve any existing local configuration. The example has no credentials. Development defaults to a temporary SQLite database and generates an ephemeral secret key when none is supplied. The key changes on restart; there are no authentication sessions or signed learner data to preserve at this stage. A stable key may be supplied privately in local environment configuration.

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

`migrate` initializes Django's built-in contenttypes tables only. Domain apps have no models/migrations, and no student or other research records are inserted. The health endpoint works without database tables and is intentionally not a database-readiness check.

## Health endpoint

Open **http://127.0.0.1:8000/api/v1/health/** locally:

```json
{"status":"ok","service":"ai-ta-backend","version":"v1"}
```

It supports GET/HEAD/OPTIONS. POST is not supported. The namespace is `v1:health` and DRF uses namespace versioning. There is no v2, admin/login route, student route, or observation route. A 200 response establishes API liveness, **not PostgreSQL connectivity**.

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
    accounts/         # placeholder only; no authentication yet
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

Every app has an `AppConfig` and package marker. Django ORM is configured, but business models, serializers, CRUD, and permissions for learner records are intentionally deferred. The only built-in model is Django contenttypes metadata. No `django.contrib.auth`, sessions, admin, login, or token/JWT functionality is installed. DRF has no authentication classes and a default `IsAuthenticated` permission (deny anonymous access); the read-only health view alone explicitly uses `AllowAny`. Authentication and authorized data access require a later reviewed stage.

## Configuration

Settings read `backend/.env` using python-dotenv; actual process environment values take precedence. `.env`, virtual environments, database files, Python caches, and logs are ignored by Git. Never add passwords, private keys, or real learner information to tracked files.

| Variable | Development default / meaning |
| --- | --- |
| `DJANGO_SETTINGS_MODULE` | `config.settings.development` for management commands |
| `DJANGO_SECRET_KEY` | Empty locally generates an ephemeral key; strong external key required in production |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1,[::1]` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Empty; no cross-origin state-changing API yet |
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
- No proxy-forwarded headers are trusted automatically. Proxy/TLS handling, production server/process management, authenticated access and database connectivity must be separately reviewed before deployment. This is a configuration foundation, not a production-readiness claim.
- No wildcard CORS or credentialed cross-origin access is enabled. CORS is not authorization. Health is public and contains no research data; learner-record APIs do not exist.
- Foundation logs omit request payloads, URLs, headers, identifiers, messages, and traceback details. This deliberately limits diagnostics until a reviewed privacy-preserving logging policy exists. Debug development pages are local-only; do not enter real research data.

## Validation

From `backend`, using your virtual environment's Python:

```sh
.venv/bin/python manage.py check
.venv/bin/python manage.py test apps.governance.tests --verbosity 2
.venv/bin/python -m pip check
```

On Windows replace `.venv/bin/python` with `.\.venv\Scripts\python.exe`. The 25 backend tests cover JSON health without database access, allowed methods/versioning, absent domain routes/models, Vite CORS/preflight, blocked unknown origins, default-denied API views, sanitized logging, SQLite/PostgreSQL selection, required PostgreSQL fields and port validation, driver compatibility, and production settings guards. They create no learner records and do not test PostgreSQL.

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

Only the successful connection/SQL command establishes connectivity. `check` can pass without connecting; health remains an API-liveness endpoint and deliberately does not check the database. `migrate --check` verifies that migrations are applied in the selected database. Current migrations create Django contenttypes metadata only: there are no domain models, learner records, or copied frontend data.

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
