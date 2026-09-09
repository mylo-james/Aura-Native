# Aura

Aura is a daily mood tracker with activity selection, journal history, and a friends feed. This development checkout restores the fuller React Native app in a browser through React Native Web. The original native projects remain in `ios/` and `android/`.

## Local development

Verified with Node 26.8.1, npm 12.0.2, Python 3.11.16, and Chrome on macOS.

```sh
npm ci
python3.11 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
```

In one terminal:

```sh
npm run api
```

In a second terminal:

```sh
npm run web
```

Open http://127.0.0.1:3110. The API runs on 127.0.0.1:5051; the browser forwards `/api` requests to it. Both servers must remain running. The local database is created automatically and existing data is retained across restarts.

Create an account with a fictional name and phone number to try the demo. No SMS service is used for registration. Passwords require at least eight characters, including an uppercase letter, a lowercase letter, and a digit.

The recovery machine also has a fictional account: phone `202-555-0101`, password `AuraLocal1!`. It is local data, not a seeded account in the repository.

## Verification

```sh
npm run build:web
backend/.venv/bin/python -m unittest discover -s backend/tests -v
```

The browser build checks compilation; the running demo uses the development server. Verified browser flows include registration, login, mood slider changes, activity selection, journal creation and editing, history after reload, navigation, logout, adding a fictional friend through Tailscale, and a 390px phone viewport.

## Backend provenance and local configuration

`backend/` contains the application and migration source from [Aura-backend](https://github.com/mylo-james/Aura-backend), commit `31c175133f82909c7ff57446d10f313485db07f6`. It is included directly so frontend and API development use one repository. The obsolete seed script references another application's models and was not imported.

Local startup uses `backend/instance/aura.sqlite3` and a generated signing key in `backend/instance/.secret-key`. Both are ignored by Git. The old hosted database credentials and signing key were replaced in the imported configuration. `DATABASE_URL` and `SECRET_KEY` can explicitly override the local defaults. Startup never runs the legacy reset/seed script.

The frontend base is [Aura-Native](https://github.com/mylo-james/Aura-Native), commit `8ea79a65b735536a7b0d7e5ee5409ff5d109b91b`. Its last application feature work is later and more complete than the older [Aura website](https://github.com/mylo-james/Aura), whose feed, account, and statistics pages are empty. Later dependency-bot branches are not newer application versions.

## Tailscale demo

On the recovery machine, the private tailnet demo is https://mylos-mac-mini.tail0c4e0a.ts.net:8449/. It forwards to the web server and requires both local processes above. Other Tailscale routes are independent.

To stop only the Aura route:

```sh
tailscale serve --https=8449 off
```

To restore that route:

```sh
tailscale serve --bg --https=8449 http://127.0.0.1:3110
```

## Current limits

This is a recovered development demo. Statistics remains the original Coming Soon screen; resource content and the native iOS/Android builds have not been revalidated. The original API trusts user IDs on mood/follow routes, so authentication and authorization need a separate review before use with real personal data or public hosting. Dependency modernization is also unfinished. Use fictional data in the local and tailnet demo.

The iOS simulator was unavailable on the recovery machine because only Xcode Command Line Tools were installed. Browser verification does not establish an iOS or Android build.
