# F01: Persisted room contract

Implemented 2026-10-09. This is the data-decoding foundation for the staged fix plan in `../../outputs/fix-plan.md`; see [F02_ROOM_TRANSACTIONS.md](F02_ROOM_TRANSACTIONS.md) for the subsequent database transaction changes. Client synchronization, full API authorization and production deployment remain later stages.

## Schema and decoding

`lib/server/roomRecord.ts` defines schema version **1**. New rooms write a root `schemaVersion: 1`. Unversioned rooms and explicit version 0 are legacy inputs accepted by `decodeRoomRecord(value, expectedCode)` in `roomSchema.ts`. The decoder returns an in-memory version 1 record. Reading never migrates or deletes stored data; a later valid write can persist the normalized record through the existing service. Unknown versions are rejected rather than guessed.

RTDB omits null children and empty arrays/objects. A numeric collection may come back as a shortened array or an object containing only numeric keys. The decoder restores two-position nullable tuples without shifting seat indices, empty lists, empty receipt/member maps, and null round/deck fields. It preserves `false`, numeric zero and empty display strings.

| Field category | Missing/null input |
|---|---|
| Nullable seat/answer/decision/guess tuples | Restore omitted entries to null at their original indices |
| Round history, revealed answers, receipts, members | Restore empty collections; validate any entries that exist |
| Current round and match deck | Null permitted in lobby; both required in active games |
| Boolean ack/ready/rematch tuples and numeric scores | Required; no invented defaults for data RTDB would retain |
| Room code, game identity, phase, expiry, roles and scenario content | Required and validated |

Non-nullable pairs must contain both positions. Lists must be contiguous. Roles must be valid and distinct for each round; scenarios contain four clues and valid option lists. Membership must agree with occupied seats. Active rounds require both seats and consistent round/history indices. Extra server/editorial fields are not copied into decoded scenario or client projections.

Only a null snapshot represents an absent room. Malformed records and unsupported versions throw `InvalidRoomDataError` with a generic Thai recovery message. F01 propagated this through the existing database fallback; F02 now propagates it through authoritative reads and CAS transactions. Invalid data is never reported as missing or silently repaired by writing guessed state.

## Public and private projections

Stored `public` and `private` are derived views. The decoder rebuilds them from validated `server.gameState` and membership using explicit allowlists in `roomProjection.ts`. Existing field names remain compatible with the current client.

Both projections carry match/round/clue context; private also carries phase. The compatibility `roundId` is `matchId:round:roundIndex` when a round exists, otherwise null. **F03 must make match identity fresh on rematch and enforce command context.** This compatibility ID alone is not stale-command protection.

Private fields added for the caller's seat:

- `roleAcknowledged`, `answerSubmitted`, `revealAcknowledged`
- `decisionSubmitted`, `nextRoundReady`, `rematchRequested`

These are persisted state, not client-local flags. `decisionSubmitted` applies to the current clue and differs from `hasGuessed`, which stays true after a guess in an earlier clue. F04 will connect these fields to UI resume behavior; adding the data fields does not yet fix refresh behavior in the current UI.

No opponent decision, sealed answer, private ack flags, receipt map, future deck, internal revision or write timestamp appears in public. A single private decision before the barrier does not change public or the other player's private projection.

## Revision contract for F02/F04

Do not add a public revision counter that increments on every server action. Such a counter would reveal activity during secret decisions.

- Internal revision belongs under `server` and can advance on every committed mutation.
- Public view revision advances only when the public allowlist changes.
- Each uid's private view revision advances only when that uid's allowlist changes.
- Rebuilt views retain their prior revision when unchanged; public/private context must be checked before rendering them together.
- View revisions now commit atomically with state in F02. Fresh match identity on rematch is F03 and client consumption is F04. No placeholder revision counters were shipped in F01.

## Verification boundary

Regression tests use the installed Firebase SDK's serializer in an isolated test wrapper without starting Firebase or connecting to a database. They cover null/empty/sparse values, legacy rooms, invalid records, privacy, four complete rounds with reloads after every action, and rematch. Service hydration tests mock every database operation and exercise the actual fallback read path.

These tests do not prove multi-instance atomicity, live Rules correctness or Vercel gameplay. Those remain the later stages of the plan.
