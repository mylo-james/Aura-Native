# Architecture and API

Aura serves the exported Expo application and its API from one origin through a single Waitress process. The client uses React Native layout primitives, web semantic adapters, Expo Router, and TanStack Query. It retains original character assets byte for byte. Native counterparts are source preparation; they have not been built or verified on iOS or Android.

## Data and session boundaries

An opaque principal in a signed, HttpOnly cookie owns each demo. A public generation value partitions client cache keys and is not an authentication credential. The browser stores unsaved drafts only in memory. Reload discards unsaved writing; saved moments reload from SQLite.

A demo expires 24 hours after creation. Ordinary reads do not extend that deadline. Reset atomically deletes its principal and cascading records, creates a fresh fixture set, and rotates the cookie. Old cookies lose access. Startup, a stop-aware 60-second worker, and an explicit cleanup command remove expired sessions. This is temporary demo storage, not a personal health-record service.

All mutations use same-origin JSON, CSRF validation and strict DTOs. Cookie settings are Secure, HttpOnly, SameSite=Lax and host-only for HTTPS. The configured loopback-only development exception uses a separate cookie name. The server validates the exact external Host and mutation Origin, ignores untrusted forwarded headers, and never enables credentialed CORS.

SQLite enables foreign keys, WAL and a five-second busy timeout on real connections. Serialized write transactions use `BEGIN IMMEDIATE` before ownership, capacity, version and idempotency reads. An operation record commits with the moment. Identical POST/PUT retries return the recorded result; changed payload reuse returns 409. Expected versions prevent concurrent editors silently overwriting each other. A deleted or foreign moment returns the same 404 response.

## Endpoints

Start with `GET /api/demo`, retain its cookie and send its `csrfToken` as `X-CSRFToken` on every mutation. All API responses have `Cache-Control: no-store`.

| Method and path                      | Input or result                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `GET /api/health`                    | Service and schema health                                                      |
| `GET /api/demo`                      | Active state, CSRF token, expiry, timezone and generation                      |
| `POST /api/demo`                     | `{timezone: "America/Chicago"}`; create or resume the signed bootstrap session |
| `POST /api/demo/reset`               | `{confirm: true}`; replace this visitor's session                              |
| `GET /api/moments?limit=20&cursor=…` | Owned moments, descending creation time/ID, opaque next cursor                 |
| `POST /api/moments`                  | Create using a unique `operationId`                                            |
| `GET /api/moments/:id`               | Owned detail                                                                   |
| `PUT /api/moments/:id`               | Full editable input plus `expectedVersion` and `operationId`                   |
| `DELETE /api/moments/:id`            | Remove the owned record                                                        |
| `GET /api/patterns?days=7`           | 7 or 30 local-calendar days, counts and distributions                          |

Moment input uses `mood` 1–5 (Low, Tender, Okay, Good, Bright), `influences` containing distinct IDs 1–9, optional `title` up to 50 Unicode code points, optional `body` up to 2,000 code points, and a UUID `operationId`. Influence IDs map to Work, School, Hobbies, Family, Love, Friends, Sleep, Health and Exercise in that order. Unknown fields, wrong types and booleans as integers are rejected. The request body limit is 16 KiB. List limits are 1–50.

Errors use `{error: {code, message, requestId, fields?}}`. Field errors are 400; expired sessions 401; Origin/CSRF errors 403; missing records 404; changed idempotency payload or stale versions 409; large requests 413; rate/capacity limits 429. Use the returned `Retry-After` where present. Retry an uncertain save with its original operation UUID and unchanged payload.

## Patterns and limits

A session keeps the timezone selected at creation, with an explicit UTC fallback for an invalid timezone. Calendar windows include local today and the previous 6 or 29 dates, using timezone-aware boundaries across DST. The server excludes future moments. Every check-in contributes once to the denominator, including multiple check-ins in one day. Influence percentages can overlap because a check-in can have several influences. Counts describe entries, with no diagnosis or causal inference.

Limits: 500 active sessions, 100 moments per session including fixtures, 5 create/reset requests per peer per minute and 30 globally, 30 writes per principal per minute and 300 globally, and 120 reads per principal per minute. In-memory rate counters require the documented single-process deployment. The loopback proxy appears as a shared peer, so the stricter shared entry limit is deliberate for this small demo.

## Dependency exception

The modern client uses Expo's supported dependency versions. `decode-uri-component` is overridden to 0.5.0 to fix [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr). That release uses an ESM default export; `patches/query-string+7.1.3.patch` adapts the existing CommonJS caller with a one-line `.default` access. `patch-package` applies it during `npm ci`. A unit regression checks normal Unicode and a large malformed query. Remove the patch and override when the supported Expo Router dependency chain adopts a compatible fixed decoder; verify both the Node adapter and web export first.

The remaining `uuid@7.0.3` advisory is in Expo's config-plugin/xcode build path. The inspected xcode caller uses v4 rather than the affected versioned buffer APIs; this package is not part of the inspected exported web runtime. Re-audit on dependency updates. An audit with reported moderate build dependencies is not a zero-vulnerability claim.
