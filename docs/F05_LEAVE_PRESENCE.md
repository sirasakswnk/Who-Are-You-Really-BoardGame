# F05: Explicit departure and per-connection presence

Implemented locally on 2026-10-09. No deployment or live database/Rules writes. F01–F04 work remains preserved in this checkout. F06–F08 are still separate steps.

## Departure contract

`POST /api/room/leave` uses the current authenticated uid and the F03 UUID/match/round/clue context. The request accepts no client seat, host flag or state. Membership, seats, public/private projections and the payload-bound receipt commit at the same room CAS boundary.

Departure is bound to the match identity. A clue/round may advance while the request is travelling; departure still applies to that same match. A departure from an earlier match cannot end a rematch. A replay with the original uid, ID and exact context returns the committed success even after that uid's membership has been removed. Changed payload/context or another uid cannot reuse that receipt. Other game-command receipts still require current membership. A full game receipt ledger does not prevent explicit departure.

- Lobby departure clears that seat and its member/private view. The remaining player keeps their seat, becomes host, and must confirm ready for a new partner. Join finds either empty seat; it no longer assumes the free seat is seat 1. Only the actual host can start.
- Active phases ROLE_INTRO through ROUND_REVEAL become ABANDONED after departure. The public termination reason includes the departing player's display name/seat; no new points, completed-round entries or full-game winner are assigned. The remaining player can reload to that terminal screen and leave. Neither gameplay nor replacing the missing player is allowed.
- A completed MATCH_RESULT keeps its completed scores/result when a player leaves. One-player rematch is rejected; the remaining player can leave. F06 still supplies the complete revealed history to the UI.
- The last departure makes CLOSED. The aggregate remains as a tombstone with its receipts so response-loss retries are possible and its code is not reused. It admits no joins, including the former uid. Physical cleanup remains F07.

RTDB decoding accepts terminal sparse/empty seats and validates the active-round/history shape. Abandoned projections contain only the existing public allowlist and caller-private data; they do not publish an unrevealed opponent role/guess. The departed uid loses API/private access.

## Client recovery

All visible in-room departure buttons call RoomSession.leave and wait for the confirmed POST before navigating. Sending disables departure controls and serializes writes. An uncertain leave is persisted in versioned sessionStorage with the original UUID/context, blocks gameplay, and exposes retry. Retry goes directly to the leave endpoint: GET can legitimately return 403 after the leave already committed. Reload recovers that receipt before navigating; changing phase alone never proves a leave.

Explicit departure can replace an uncertain game command once its in-flight transport has settled. Those requests still serialize at server CAS; a departure ends only their match. Leaving in another tab is detected by a newer membership projection or a previously authorized API read returning membership denial. Older public events cannot cause an exit. There is no unload/pagehide action withdrawing membership: refresh, route disappearance, closing a tab and network interruption only affect presence.

The home link on the initial connection-error screen is navigation only because membership cannot yet be established. It does not claim to have left. A recovered pending leave also has an explicit retry button there. When storage is blocked, pending identity survives only for the live controller, as documented in F04.

## Presence and Rules

Each connected room/tab lifecycle owns a fresh `presence/{code}/{uid}/{connectionId}` leaf containing true. On reconnect the controller creates a new ID. It awaits `onDisconnect(...).remove()` before publishing online, following the [Firebase presence guidance](https://firebase.google.com/docs/database/web/offline-capabilities). One of several remaining true leaves keeps that uid online. No presence callback changes membership, scores, roles or expiry.

Unmount/explicit exit removes only its own connection and cancels its disconnect registration only after that removal succeeds. If offline removal is pending/fails, onDisconnect stays armed. Late registration/writes are cleaned up; old connection callbacks and retry timers cannot mutate a disposed controller. Registration failures back off, and disconnected/denied reads render unknown rather than asserting the opponent is offline. Actual crash/disconnect recognition follows the Firebase server's detection timing.

Presence reads require live room membership and unexpired server expiry. Publishing requires the caller's own uid, membership, unexpired room, non-CLOSED phase, a bounded connection key and true value. Own-leaf deletion stays allowed after leave/expiry so the server's second security check can execute onDisconnect cleanup. Writes to another uid, parent game state or server data remain denied. Private reads additionally require membership so departure revokes them. The remainder of the expiry/Rules audit stays F07.

These Rules are saved locally; they have not been deployed or confirmed by a running emulator. Release must deploy compatible code and Rules together after F07/F08 acceptance.

## Verification

The isolated local suite passes 279 tests in 20 files, including 36 new F05 regressions. Coverage includes host transfer and replacement seat 0, concurrent lobby exits, all five active phases, completed-result departure, terminal decoding, unchanged scores/history, response loss/replay, write rejection, stale-match rejection, HTTP validation, client reload after abandonment, API-only host transfer, pending-leave persistence and two-tab presence/cleanup races. SSR checks cover termination, disabled controls, unknown/offline distinction and neutral own-submission wait labels.

TypeScript, ESLint and diff whitespace pass. Existing live-credential `firebase-connection.test.ts` is excluded from this isolated run.

Five optional real Rules/SDK tests live in `tests/integration/presence-rules-emulator.test.ts`. They require explicit loopback `F05_RTDB_EMULATOR_HOST`, load the actual Rules into a unique local namespace, test access/validation/cleanup, and test two real SDK connections with onDisconnect after membership removal. CI opts into these inside its database emulator step. They and the two F02 emulator tests are skipped here: emulator startup fails with `Permission denied: connect` while opening a loopback selector. No real Rules/onDisconnect result is claimed.

Production build also fails before application compilation while loading next.config.ts: Windows SWC cannot canonicalize jsc.baseUrl (`Access is denied`, os error 5). Browser hydration/layout/E2E, live presence and Vercel are therefore unverified. No configuration workaround or deployment was performed.

## Remaining steps

F06: complete revealed history, rematch reset and notes. F07: rolling expiry, remaining Rules audit and dry-run cleanup of tombstones/presence/request records. F08: actual emulator, two-browser game flow and authorized Vercel deployment acceptance.
