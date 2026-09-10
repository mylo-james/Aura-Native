# Vercel and Neon deployment

Aura deploys as one Flask WSGI function in Vercel's Ohio region (`cle1`).
The function serves both the exported Expo web client and `/api`, preserving the
same-origin request model, secure host-only session cookie, API origin checks,
and CSP `frame-ancestors` policy already owned by Flask.

## Build and runtime

Vercel's Flask builder reads the pinned root `requirements.txt` directly. It
is a generated mirror of `backend/requirements.txt`: Vercel's current Flask
parser does not accept a nested `-r backend/requirements.txt` directive. Keep
the two package pins synchronized when backend dependencies change. It uses
Python 3.13 and runs:

```sh
npx --yes npm@11.19.1 ci
npx --yes npm@11.19.1 run build:web
```

Both commands pin npm so the host's bundled version cannot violate the
repository's required tool version. The explicit install is necessary because
Flask framework detection does not install Expo's Node dependencies itself.

That creates `client/dist`. The explicit Flask preset in `vercel.json` bundles
the export and Python backend together. The root `app.py` entry point
sets that export as the default `AURA_DEMO_STATIC_DIR`; an explicitly supplied
value remains available for local serving and tests.

The deployment uses Vercel's native Python/Flask runtime. It does not run
`backend/serve_demo.py`, Waitress, or its background cleanup thread. Function
imports must not run migrations, delete records, or write files outside `/tmp`.

## Required production environment

Configure these encrypted Vercel environment variables for the Production
environment before assigning the custom domain:

| Variable | Required value |
| --- | --- |
| `AURA_DATABASE_URL` | Pooled Neon PostgreSQL SQLAlchemy URL using the `postgresql+psycopg` dialect. Do not use a generic `DATABASE_URL`. |
| `AURA_SECRET_KEY` | Random secret of at least 32 characters. It signs Aura's host-only session cookie. |
| `AURA_EXTERNAL_ORIGIN` | Exact public HTTPS origin, for example `https://aura.mjames.dev`. |
| `AURA_FRAME_ANCESTORS` | Comma-separated exact permitted parent origins, initially `https://mjames.dev`. |
| `CRON_SECRET` | Random secret of at least 32 characters, used only to authenticate Vercel's cleanup request. |

Use a separate, direct Neon URL only in the controlled release environment that
runs Alembic migrations. Do not expose that migration credential to the Vercel
runtime. This is a fresh PostgreSQL database: existing local SQLite demo data
is intentionally not imported.

The runtime login has schema usage and read/write/delete access only to Aura's
five demo tables. It can read `alembic_version` for health checks but cannot
modify it, create schema objects, or administer the database. PostgreSQL uses
certificate and hostname verification with the pinned Certifi trust bundle.

## Release order

1. Create the empty Neon database in the selected region and keep its pooled
   runtime URL and direct migration URL separate.
2. Run the reviewed Alembic migration once with the direct migration URL.
3. Validate the native function bundle from the reviewed clean source before
   publication. Configure the required Production variables and deploy that
   candidate. Keep the portfolio embed disabled until live verification passes.
4. Assign `aura.mjames.dev`, then verify direct load and reload of an Expo route,
   same-origin `/api` calls, HTTPS host-only session behavior, and protected
   cleanup on that exact origin. Vercel-generated aliases are intentionally not
   accepted by the application's exact Host check.
5. Enable the portfolio embed and verify the real iframe from `https://mjames.dev`.
   Confirm CSP contains only the configured frame ancestors. The declared Cron
   becomes active with the production deployment, so the authenticated cleanup
   handler must be ready before that deployment.

A separate preview deployment needs its own exact external origin, allowed
preview parent, database, and secrets. Production-only settings do not make an
arbitrary Vercel preview alias an accepted application origin.

## Cleanup and rate limits

The maintenance route is `GET /api/maintenance/cleanup`, scheduled daily at
08:23 UTC. Vercel sends `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET`
is configured. The route must reject all other callers and be idempotent: a
late or repeated physical delete is safe because expired demo sessions are
already rejected logically after 24 hours.

Daily cleanup normally removes expired rows within about another 24 hours.
Vercel Hobby may invoke the job late and does not automatically retry failures.
Inspect the native Cron/function logs after deployment and use the same
authenticated endpoint for a deliberate retry if needed.

The function must use the reviewed shared PostgreSQL rate-limit storage. Do not
restore Flask-Limiter's `memory://` storage for the public deployment because
it is isolated per serverless instance.

## Operational boundaries

No database migration runs on function import or on an ordinary request. The
health route may establish database reachability, while a release procedure
owns schema changes. Keep deploy rollback separate from database rollback: an
application rollback is safe only while its expected schema remains available.

Vercel's Python runtime, function bundling, and Cron configuration are verified
through the platform's current documentation. The native build must still
prove this repository's combined Node build and Python function package before
production publication.

- [Vercel Python runtime](https://vercel.com/docs/functions/runtimes/python)
- [Vercel Flask deployment guide](https://vercel.com/kb/guide/ship-a-flask-app-on-vercel)
- [Vercel project configuration](https://vercel.com/docs/project-configuration)
- [Vercel Cron jobs](https://vercel.com/docs/cron-jobs)
- [Neon Python connection guide](https://neon.com/docs/guides/python)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
