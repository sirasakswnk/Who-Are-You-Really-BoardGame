# F02: Database-authoritative room transactions

Implemented in the local checkout on 2026-10-09. No deployment or live data migration has been performed.

This document records the F02 milestone. The command/receipt validation items described as pending below are now implemented locally in [F03_COMMAND_SECURITY.md](F03_COMMAND_SECURITY.md); the remaining UI and deployment stages still apply.

## Store and transaction boundary

All room routes now call the room service. GET reads fresh database state, and create/join/ready/start/game actions commit using the room store. Production never falls back to `memoryRooms`; missing credentials or failed transport returns an error. The memory implementation is selected only in isolated `NODE_ENV=test` runs without an emulator. Existing test suites use a simulated REST server with actual Firebase serialization; any memory mirror is for inspection only.

`roomStore.ts` implements Firebase's [REST equivalent to transactions](https://firebase.google.com/docs/database/rest/save-data#section-conditional-requests): GET with `X-Firebase-ETag: true`, then PUT with `if-match` for that exact version. HTTP 412 means no write happened; the operation reads fresh state and reruns its pure update. This avoids the Node RTDB SDK's local cache and offline write queue for request handling. There is no unconditional room PUT, PATCH or SDK `.set(room)` in the production service.

The room aggregate contains authoritative state, members, derived public/private views and receipts. They commit in a single conditional write. Membership and the caller's seat are resolved inside that update, not from an earlier API read. Random roles/decks/IDs and timestamps are prepared outside retry callbacks. No callback generates randomness, calls the network, mutates caller actions, or emits logs.

Each HTTP request is bounded to 10 seconds by default, including access-token acquisition and response parsing. Each CAS operation has a 20-second total budget and at most 32 attempts. Conflict exhaustion, missing ETag, database rejection and transport errors fail explicitly. Service-account credentials obtain the [OAuth access token](https://firebase.google.com/docs/database/rest/auth#authenticate-with-an-access-token) using the existing Admin credential provider; tokens never appear in a URL or logs.

## Commit confirmation and recovery

API success follows a confirmed conditional commit, or a fresh read proving the original receipt already exists. An aborted/failed response after a PUT can still have committed. Storage errors return HTTP 503 with `retryable: true` and a generic Thai message. A retry of an action uses the original actionId; the stored receipt avoids applying it twice. F03 still needs to bind receipts to uid/payload/match/round rather than only checking the action type.

GET failures return a storage error instead of “room not found”. Missing rooms, non-members, expired rooms and malformed persisted data remain distinct service outcomes. API error responses do not serialize the aggregate or secret data.

## Atomic code reservation and create identity

Room codes use `node:crypto.randomInt` and the existing six-character alphabet. Existing rooms, including malformed ones, cannot be overwritten by a code collision. A collision selects a fresh code outside callbacks and retries at most ten times per create call.

The create API accepts `requestId`. The current home UI generates a UUID (or a random 128-bit token for HTTP LAN previews without randomUUID) once and keeps the original requestId/profile in sessionStorage, with a component ref fallback when storage is blocked. Retries and reloads preserve the original payload even if the visible form was subsequently edited. A successful response or a definitive error clears the pending request. Requests from a different auth uid do not reuse the previous identity. Older clients that omit requestId still work, but cannot recover identity after losing a response.

`roomCreationRequests/{sha256([uid, requestId])}` stores a server-only reservation `{code, fingerprint, createdAt}`. The reservation is persisted before the code claim. The room's server subtree stores the matching creation receipt. Concurrent retries converge to that code, then either claim the empty room or read the matching receipt. Code collisions rotate the reservation with CAS. Unknown write outcomes never rotate it. A repeated identity with changed profile is rejected (409), and an expired request requires a new identity (410).

The reservation and room claim use two transactions, not a root transaction. A process interruption between them leaves a recoverable reservation; no response reports success until the room exists. The new reservation path is covered by the existing root-deny Rules, with no client grant. F07 cleanup must include expired reservations and retain them at least for the create retry window; do not delete active retry records prematurely.

## Revisions and privacy

Every committed room mutation increments `server.revision`. Public revision increases only when the public allowlist changes; each uid's private revision increases only when that uid's view changes. A single secret guess/continue leaves both public and the opponent's private payload and revision unchanged. Receipt replays do not write or increment revisions. F01 decoding preserves these fields and the creation receipt; legacy rooms without revisions remain readable. F04 will consume revisions to prevent stale UI updates.

## Verification and remaining scope

Local regression tests cover independent transports/instances, conflicting join/ready/answer/decision operations, score-once behavior, code collisions, create races, response loss at both create reservation and room commit, action response timeout after commit, write rejection, bounded conflicts, fresh GET errors, secret-independent revisions, and client create identity recovery.

`tests/integration/room-transactions-emulator.test.ts` runs only with an explicit loopback `F02_RTDB_EMULATOR_HOST`. It uses a unique local namespace and removes only that namespace after its tests. CI enables it inside the existing Firebase Emulator execution step. To run locally with an already running database emulator:

```powershell
$env:F02_RTDB_EMULATOR_HOST = '127.0.0.1:9000'
npm.cmd test -- tests/integration/room-transactions-emulator.test.ts
```

On this host the emulator startup failed with `Permission denied: connect` while establishing a loopback selector. The two real-emulator tests were skipped locally; simulated CAS tests are not reported as live/emulator success. Next production build also failed before application compilation due to the Windows SWC path permission error present during F01. Typecheck/lint and local non-network regressions are verified separately in `../../outputs/fix-progress.md`.

F03 command whitelisting, payload-bound receipts and stale match/round rejection are still pending. GameContainer retries/refresh/token handling remain F04, lifecycle and Rules deployment remain F05/F07, and full browser/Vercel acceptance remains F08. Do not release the intermediate backend before the staged contract changes and full verification are complete.
