# Running the demo

The production process serves static files and API requests from one origin. Use one Python process with its four Waitress threads and one persistent SQLite state directory. Do not run multiple workers with independent in-memory rate counters or move a live SQLite database between replicas.

## Initialize and migrate

Set the environment from the README. Run:

```sh
backend/.venv-demo/bin/python backend/serve_demo.py --init-state
```

This explicitly creates the private key/database when missing and applies `backend/migrations-demo`. It is also the migration command for an existing demo directory. Keep the service stopped during upgrades and preserve a consistent database/key backup if the demo data needs retention. Never point it at recovery storage or copy recovery data into the demo database. Normal startup fails if the key, schema or static export is missing.

Cleanup is automatic at startup and every 60 seconds while the service is running. To invoke it directly with the same configuration:

```sh
PYTHONPATH=backend backend/.venv-demo/bin/python -m flask --app aura_demo:create_app demo-cleanup
```

## Private Tailscale preview

The private preview address is `https://mylos-mac-mini.tail0c4e0a.ts.net:8449/`. It requires access to the owner's tailnet and a running local service. No startup service is installed.

From this checkout, use the production configuration:

```sh
export AURA_DEMO_STATE_DIR="$PWD/backend/instance-demo"
export AURA_DEMO_STATIC_DIR="$PWD/client/dist"
export AURA_EXTERNAL_ORIGIN='https://mylos-mac-mini.tail0c4e0a.ts.net:8449'
unset AURA_ALLOW_INSECURE_LOOPBACK
unset AURA_FRAME_ANCESTORS
npm run serve:demo
```

The service listens only on `127.0.0.1:3111`. Tailscale terminates HTTPS and preserves the external Host. The exact HTTPS Origin is required for writes. A raw request to `http://127.0.0.1:3111` with its normal Host is intentionally rejected in this configuration; use the HTTPS address for application checks.

When restarting, identify the process listening on 3111 and confirm its command is this checkout's `backend/serve_demo.py` before sending SIGTERM. Start it again with the same configuration. Do not terminate another listener or reset the machine's full Tailscale serve configuration. The handoff record outside the app identifies the current owned process.

## Troubleshooting

- **Configuration error before startup:** verify the exact external origin, initialized state, permissions, current migration and built `client/dist/index.html`.
- **403 on a save:** open the configured origin. Aura refreshes an expired CSRF token once. Cross-site embedded cookie restrictions require the standalone link.
- **429:** wait for `Retry-After`. Tests use isolated databases/services so test visitors cannot consume the preview's capacity.
- **Expired demo:** the session and its drafts are cleared. Start a fresh demo; the old temporary records cannot be recovered through the app.
- **Interrupted save:** retry the same draft. The operation UUID prevents an identical retry from creating a second moment.
- **Old client after a source change:** rebuild the export, restart Python if needed, and reload. HTML/API are not cached; hashed assets are immutable.

## Recovery reference

Checkpoint `79a537c67216b017ecdb952ce6ce4c06d9f172ed` preserves the recovered source. Inspect it with `git show` or create a separate recovery worktree if a rollback is needed. Its old dependency tree needs reconstruction before running. A source checkpoint alone does not mean the old process is healthy. Preserve `backend/instance/aura.sqlite3`, `backend/instance/.secret-key` and `backend/.venv`; the new service neither imports nor selects them.
