# Aura

A small mood journal: notice how you feel, keep a moment, and explore what has been part of your days. Aura preserves its original indigo palette and six character illustrations, with brief mood animations and reduced-motion support.

This repository contains the complete mobile-first web demo: an Expo/React Native client and a Flask/SQLite service. It opens at phone width on a desktop and works without an account. Each visitor gets an isolated, temporary 24-hour demo with 24 clearly fictional starting moments. Use made-up details.

## Run locally

Requirements: Node **24.19.0**, npm **11.19.1**, and Python **3.13**. Use a Node version manager and select the version in `.node-version`. The npm lockfile is authoritative; install with the declared npm version without peer-dependency bypasses.

```sh
npm ci
python3.13 -m venv backend/.venv-demo
backend/.venv-demo/bin/python -m pip install --require-hashes -r backend/requirements-dev.txt
npm run build:web

export AURA_DEMO_STATE_DIR="$PWD/backend/instance-demo"
export AURA_DEMO_STATIC_DIR="$PWD/client/dist"
export AURA_EXTERNAL_ORIGIN='http://127.0.0.1:3111'
export AURA_ALLOW_INSECURE_LOOPBACK=1
backend/.venv-demo/bin/python backend/serve_demo.py --init-state
npm run serve:demo
```

Open **http://127.0.0.1:3111**. Keep the server terminal open. Stop it with Ctrl-C. After client edits, run `npm run build:web` again and reload. Restart the server after Python edits. `npm run web` builds and starts this integrated local demo using the same environment variables.

The explicit state directory contains the demo database and signing key. It must have mode `0700`; its key and database must have mode `0600`. Initialization creates those files and applies migrations. Normal startup requires initialized state and the built client. Recovery storage under `backend/instance` is rejected before initialization effects. The generic `DATABASE_URL` and `SECRET_KEY` variables are ignored by this app.

## Verify

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run test:api
node scripts/check-assets.mjs
npm run build:web
npm run test:e2e
```

The default browser suite requires installed Google Chrome. Each browser case starts its own Waitress service and migrated temporary database; it does not use your local demo state. For WebKit coverage:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.toolchain/playwright" npx playwright install webkit
AURA_TEST_WEBKIT=1 PLAYWRIGHT_BROWSERS_PATH="$PWD/.toolchain/playwright" npm run test:e2e
```

If loopback port 3112 is occupied, set `AURA_EMBED_PORT` to a free port (for example, `AURA_EMBED_PORT=3162 npm run test:e2e`). The harness never stops another listener.

`npm run test:embed` checks same-site iframe use and the cross-site cookie fallback. `tests/e2e/performance.spec.ts` records five cold local Chrome loads under a fixed mobile network/CPU profile. Its budgets are 600 KiB initial JavaScript gzip, 900 KiB initial transfer, and median LCP at most 2.5 seconds. These are local lab measurements, not public field performance.

## Project map

| Path                      | Responsibility                                                            |
| ------------------------- | ------------------------------------------------------------------------- |
| `client/src/app`          | Entry, Check-in, Moments, Patterns and About routes                       |
| `client/src/features`     | Session generation, in-memory drafts, request state and editor safeguards |
| `client/src/components`   | Shared controls, original characters and platform adapters                |
| `backend/aura_demo`       | Strict API, temporary sessions, owned journal data and summaries          |
| `backend/migrations-demo` | Dedicated SQLite schema migrations                                        |
| `backend/tests`, `tests`  | Real database contracts, browser journeys and failure cases               |
| `docs`                    | Architecture, operation, demo script and portfolio integration            |

See [current screenshots](docs/screenshots/README.md). Start with [the demo script](docs/demo.md), [architecture and API](docs/architecture.md), [operation](docs/operations.md), and [portfolio integration](docs/portfolio-integration.md).

## Recovery and scope

The recovered application is preserved in local checkpoint `79a537c67216b017ecdb952ce6ce4c06d9f172ed`. It combines the prior Aura-Native client and recovered Python service. The current implementation consolidates their active source into this repository. The old database, signing key and Python environment are kept separately from the new demo state.

The current delivery is a web application with native-compatible source and explicit platform adapters. Physical phone checks, native iOS/Android builds, account/sharing features, public hosting and the real portfolio integration are separate work. No user counts, clinical outcomes or native-release claims are made.
