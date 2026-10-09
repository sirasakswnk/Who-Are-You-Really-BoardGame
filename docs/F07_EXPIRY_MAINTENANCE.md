# F07 — Rolling expiry, Rules and manual maintenance

Implemented locally on 2026-10-09. F01–F06 edits remain preserved. No Rules/code deployment, production cleanup, scheduler installation, commit or push occurred. F08 acceptance remains a separate user-directed step.

## Expiry and privacy

Rooms initially expire 24 hours after their create reservation timestamp. Successfully authorized, context-bound commands which change game state renew expiry to `max(previousExpiresAt, currentServerTime + 24 hours)`. This includes a newly admitted player, readiness, start, acknowledgments, answer/decision submissions, next-round readiness, rematch and explicit leave. Final leave retains a CLOSED tombstone and its receipt for that window. No-op commands may receive a receipt, but do not renew. Reads/polling, presence, repeat join/reconnect, failed commands and exact action/create replays do not renew. A new join still requires an available lobby seat; reconnecting the existing uid performs no room write.

Time is checked on each room CAS attempt, after any rate-limit/storage wait; a request that crosses the expiry boundary cannot revive the room. Time reads are validation only; random match/role/deck material remains fixed outside retries. Expired create reservations remain unusable during their retained retry window. Reads and all room mutation routes return HTTP 410 for expired rooms. API membership checks still run because Admin bypasses client Rules. A client refresh receiving 410 displays the expiry message and blocks actions. Existing displays can remain visible until their next request or subscription error; no absolute expiry timestamp is published to the opponent.

Expiry stays in server state. Renewal by one secret command changes neither public payload/revision nor the opponent's private payload/revision. Every generated room/game response has `Cache-Control: no-store`, including auth failures and validation/authorization/expiry errors. Auth and Admin initialization logs use fixed messages; raw SDK error payloads, tokens and private game state are not logged. Diagnostics expose configuration flags and safe initialization messages, not credentials.

## Rules

Client root, room parent, private parent and server reads remain denied; all game-state writes remain denied. Members, public, caller-private and presence reads require current membership plus `server/expiresAt > now`. Only a caller's own private child is readable. Own presence connection publication additionally requires an open room; deletion of one's own leaf remains permitted after expiry/membership removal for onDisconnect cleanup. Public/private/member Rules changes are local files until explicitly deployed through Firebase CLI. Vercel deployment does not deploy these Rules.

The opt-in loopback Rules/SDK tests now also check root/private-parent/metadata denial, all expired projection reads, and renewed reads after a server expiry update. Their unchanged five test cases reuse `F05_RTDB_EMULATOR_HOST`, which CI already enables. They have not run against a real emulator on this host.

## Cleanup safety and cost

`scripts/cleanup-rooms.mjs` uses the production REST CAS adapter extracted into `firebaseRestStore.ts`; roomStore re-exports preserve the application/test contract. Runtime native TypeScript requires Node.js 24 for the tested setup; CI now uses 24. The CLI requires an explicit HTTPS RTDB root URL and project, uses ADC rather than auto-loading web `.env`, and defaults to read-only dry-run. `--apply` additionally requires a matching `--confirm-project`. Read-only fixtures and `--help` need no credentials. Output contains only candidate/removed paths, cutoff and skipped counts; receipt/reservation bindings and payloads are not output.

Scanning selects at most 100 candidates by default (maximum 500). Applying performs one root ETag CAS with fresh eligibility and generation checks. Any descendant write invalidates a stale root ETag. An expired room and its presence subtree are removed atomically, so a separately deleted presence subtree cannot erase connections belonging to a reused room code. A room renewed or replaced after scanning is skipped. An orphan presence candidate is removed only if its room is still absent. Unknown root collections and active rooms are preserved. Rate records are eligible after 24 hours from windowStart (well beyond the one-minute enforcement window), and changed counters are skipped. Creation reservations become eligible after 24 hours, but an active or malformed associated room keeps them. Unverifiable expiry/metadata is retained for manual inspection.

The root read is capped at 5 MiB, eight CAS attempts and bounded network deadlines. Candidate limits bound deletions, not the full database read. This manual approach targets the current small game database; a large or heavily active database needs a separately designed maintenance mechanism. No scheduler has been installed. If the root exceeds the cap or CAS retries fail, the CLI reports an unconfirmed result without logging server data. A lost PUT response can occur after commit; rerun dry-run to inspect current eligibility before another apply. Apply is idempotent with respect to missing records. Expired action/creation identities are not guaranteed after their room/reservation retention period ends.

## Verification

- 314 local tests pass in 25 files; seven real-emulator tests are skipped (F02 CAS two and F05/F07 Rules/SDK five). No live-credential firebase-connection test was run.
- Seventeen new regressions cover exact expiry, waits across expiry, monotonic renewal, read/join/replay/no-op behavior, private renewal isolation, 410/no-store through actual routes, caller client blocking, safe auth logs, dry-run with no transactions, root CAS conflict/recheck, room-code reuse, stale/fresh metadata, unknown data preservation, bounded repeated passes, oversized reads and read-only CLI fixtures/apply guards.
- Hierarchical fake RTDB tests exercise the real REST adapter with Firebase serialization and root ETag conflicts; they do not substitute for live Rules/SDK verification.
- TypeScript, ESLint and diff whitespace pass. Production build fails before application compilation when SWC cannot canonicalize jsc.baseUrl/load next.config.ts: Windows `Access is denied (os error 5)`, as in prior steps. No build configuration workaround was introduced. Browser/emulator/Vercel acceptance remains unverified.

Next: F08 actual emulator/browser/full-game/Vercel acceptance, with deployment only on the user's instruction.
