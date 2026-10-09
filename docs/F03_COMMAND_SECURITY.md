# F03: Validated commands and replay protection

Implemented locally on 2026-10-09. No deployment, live database writes or Rules changes. This supersedes the pending F03 items in the historical F02 document.

This document records the F03 milestone. UI retry/resume/synchronization items described as pending below are now implemented locally in [F04_CLIENT_RECOVERY.md](F04_CLIENT_RECOVERY.md); browser/Vercel verification and release remain pending.

## Request contract

`lib/game/commands.ts` defines client choices separately from trusted `GameAction` engine commands. The game action endpoint permits only ROLE_ACK, SUBMIT_ANSWER, REVEAL_ACK, SUBMIT_DECISION, NEXT_ROUND_READY and REMATCH_REQUEST. Ready and start have their own endpoints. Join/leave, seat, uid, roles, scenarios/decks, scores, state and other unknown fields are rejected at the HTTP boundary. The service also validates envelopes at runtime, so another caller cannot bypass validation by casting a request.

Every ready/start/game request includes actionId (UUID), matchId, roundId (null in the lobby) and clueIndex (integer 0–3). For example:

```json
{
  "code": "ABC234",
  "actionId": "ed85fc0d-c260-41f7-9b43-384f587c6195",
  "matchId": "4e8d605d-a9bd-424a-94b1-97207cc2f8f1",
  "roundId": "4e8d605d-a9bd-424a-94b1-97207cc2f8f1:round:0",
  "clueIndex": 0,
  "action": { "type": "SUBMIT_ANSWER", "optionId": "a" }
}
```

GameContainer now sends this context and crypto UUIDs, including a UUID v4 fallback using getRandomValues for HTTP LAN previews. Legacy timestamp action IDs and envelopes missing context are rejected. Client and backend must be released together after the remaining stages. Creation keeps the F02 requestId compatibility; creation identities without a UUID remain accepted within the existing 128-character format.

All POST bodies are limited to 8 KiB of actual bytes, including chunked requests, independent of Content-Length. Invalid JSON/shape returns 400; oversized bodies return 413. Profiles require a nonempty name of at most 20 Unicode characters and one of the eight existing avatar IDs. Codes use the existing six-character alphabet. Options are limited to 128 characters; match/round IDs to 128/160 characters. Decisions accept only continue, ack or guess with a real role.

## Committed authorization and transitions

Authentication supplies uid. Membership, actor seat, expiry, host status, match/round/clue context and engine phase are checked against the decoded state inside the room transaction. The engine checks that an option belongs to the current scenario, validates decisions and retains first-submission locking, own-role rejection, forced final-clue guessing and the ack requirement after an earlier guess. Secret roles, deck and rematch UUIDs are prepared by the server once outside CAS callbacks.

The second rematch request resets to the lobby with a fresh matchId and clears the deck. Round IDs are derived from this unique matchId and roundIndex; they cannot repeat across rematches. Lobby commands captured before rematch and commands from an earlier round are rejected even when phase and clue index happen to match again.

## Receipts and uncertain outcomes

The server-only receipt key is SHA-256 of [uid, actionId]. Each successful receipt records uid, command type, matchId, roundId, clueIndex and a SHA-256 fingerprint of the canonical validated envelope. JSON key order cannot change the fingerprint. The receipt and game transition commit atomically at the room boundary.

Membership/expiry are checked first. An exact successful replay is then recognized before checking current phase/context, because the original command may already have advanced the game. It returns success without writing the room, incrementing view revisions, or scoring again. Reusing the same actor's UUID with different payload/context is rejected. Different actors using the same UUID have independent receipts. A fresh UUID cannot overwrite a locked answer/guess. Old successful retries may still return success after rematch but never affect the new game.

Legacy type-only receipts are decoded for compatibility but never prove an F03 replay. Existing bound receipts survive RTDB serialization, including lobby roundId=null. The ledger accepts at most 4096 successful commands per room to bound aggregate size; existing receipts are retained and exact replays still work at that ceiling. Creating a new room starts a new ledger. Invalid/unauthorized requests do not write room state or successful receipts; failed operations may be retried against fresh state.

## Shared request limits

`requestLimits/{sha256([uid, bucket])}` uses the same persisted CAS adapter, with a fixed 60-second window. Limits are independent of process and room:

| Bucket | Requests / window |
|---|---:|
| Create | 8 |
| Join / ready / start combined | 120 |
| Game actions | 120 |
| Room GET / polling | 300 |

GET is limited before fetching room data, including nonexistent rooms. Valid-shaped mutation attempts count even for a non-member, and exact retries consume quota. A denied quota returns HTTP 429, retryable=true and Retry-After: 60. Counter/storage failure returns the existing recoverable storage error. A counter commit alone never implies the room action committed. Replay avoids a room write, but the server-only request counter can still change. Existing root-deny Rules cover requestLimits; no client access was added. F07 cleanup must include these counters and creation reservations. Quotas apply per authenticated uid; they do not prevent someone obtaining multiple anonymous identities.

## Verification and remaining scope

The new commandSecurity suite exercises real route handlers and independent service instances against the simulated REST CAS server with Firebase SDK serialization: schema/size limits, guest start/injection, invalid choices, stale contexts, multi-tab races, cross-uid UUID collisions, changed fingerprints, ready/start replay after transitions, score-once through four rounds, fresh rematch identity, legacy receipts, bounded ledger and shared quota races/window reset.

Older F01/F02 service scenarios use a test-only client helper that converts readable action labels into retained UUID envelopes. Production has no adapter accepting their old wire format. Forced-conflict tests target the room path so rate-counter transactions cannot absorb those conflicts.

Final counts and checks are recorded in ../../outputs/fix-progress.md. The real emulator tests remain opt-in and were skipped locally; browser/Vercel verification was not performed. Production build still fails while loading next.config.ts with the existing Windows SWC jsc.baseUrl Access denied error. F04 will implement persistent UI retry identity, token refresh, resume flags, error presentation and ordered synchronization; F03 does not claim those flows are complete.
