# F04: Coherent room views and recoverable client commands

Implemented locally on 2026-10-09. No deployment, production writes, Rules changes or F05 work. The UI synchronization/retry items recorded as pending in the F03 milestone are implemented here; browser/Vercel acceptance remains unverified.

## One room session and one displayed snapshot

GameContainer owns one RoomSession per room/tab. Initial GET, realtime public/private events, polling, focus/reconnect and post-action GET all use the same snapshot merger. Each public/private stream accepts only a greater revision than its previous candidate. Equal/older responses cannot undo a newer acknowledgement, decision, phase or rematch. Legacy projections without revisions begin at zero; missing submission flags are rejected instead of invented as false.

The merger stages each candidate separately and publishes only when matchId, roundId, phase and clueIndex agree. During a mismatch it retains the last coherent screen and disables mutations. Actor seat/host metadata comes from membership in that public view, so old API seat metadata cannot override it. Room-code and actor checks prevent another session's data being displayed. Client normalization preserves RTDB nulls/sparse tuples, validates fields used for rendering, and rejects malformed roles/round summaries.

Only the existing public and current uid's private revisions are used. There is no internal room revision, opponent decision/ack/guess flag or secret activity timestamp in the new client contract. Answering uses neutral text while waiting for both players; it does not infer an opponent's private submission from polling activity.

The phase subtree is keyed by match/round/phase/clue so selections, modals and local busy flags cannot carry into another question or rematch. Persisted own roleAcknowledged, committedAnswer, revealAcknowledged, decisionSubmitted and nextRoundReady drive the views; local booleans no longer claim those actions succeeded. Already-submitted decisions show waiting after reload, including continue and ack, not just guesses. Rematch waiting continues to use the existing public flags. Full result history/notes remain F06.

## Polling and cleanup

Concurrent GET callers share one in-flight request. Polling uses a completion-scheduled timeout, not an async setInterval. Healthy public/private realtime streams use a 15-second watchdog; disconnected/failed/staged streams or a pending command use a 1.5-second fallback. Failed reads back off up to 15 seconds, HTTP 429 waits 60 seconds, and definitive membership/missing/expired-room failures stop automatic polling until an explicit reconnect/refresh. Online, focus and visibility events trigger fresh reconciliation.

After a POST the controller waits for any earlier poll to finish, then issues a new GET. It cannot mistake a pre-commit poll for the post-action state. Network/GET errors keep the last coherent screen with a Thai recovery banner and disabled action buttons. A successful fresh read enables appropriate controls again.

Each room owns the unsubscribe callbacks for its listeners and removes only those listeners. Cleanup removes browser events/timers, aborts HTTP work and ignores late results after unmount or room change. A bounded initial auth attempt exposes a reconnect button instead of spinning indefinitely. Anonymous auth restoration/sign-in is shared across concurrent callers, including Strict Mode, so initialization does not race two anonymous actors.

## Current auth and bounded transport

Room API calls read the current Firebase user and call getIdToken for every attempt. A 401 forces one token refresh and one retry. Both attempts use the identical serialized POST body. The actor is checked again after token acquisition, and a retained action is never sent under a different uid.

The 12-second request budget includes token acquisition, network response and JSON parsing. Unmount aborts it. Transport/timeouts after dispatch, server 5xx and malformed successful POST responses are treated as uncertain writes, not success. Error messages are mapped to Thai and raw non-JSON server details are not exposed. HTTP 429 remains recoverable; definitive validation/membership/expiry errors do not keep a retryable mutation pending.

## Pending identity and state confirmation

Before sending, the controller copies the choice and persists a versioned PendingAction under `wayr.pendingAction.v1:{code}` in sessionStorage. It stores uid, code and the UUID/context/choice envelope, without tokens, own secret role, opponent state, full projections or server receipts. One tab retains at most one pending mutation per room. Changed form selections or a second click cannot replace it. When storage is blocked the controller still retains the envelope in memory, but a reload cannot preserve an uncommitted request identity in that case.

Reload first fetches state. A persisted own submission flag/locked choice or completed match/round/clue/phase settles obsolete work and removes the pending identity. The visible state reflects the committed choice, including a choice another tab locked first. If the same context is still unresolved, all new mutations remain disabled. The retry button first reads state; only when it is coherent and still unresolved does it resend the original UUID, context and payload. This uses the F03 atomic receipt/locking contract without exposing the receipt ledger to the client.

A confirmed POST also proves success through F03's receipt semantics. If its subsequent GET fails, controls remain blocked with the retained envelope until fresh state can be shown. Later retry can recover the receipt, including when another tab changed readiness after the original POST. If realtime already proves a locked/completed state before a lost response arrives, that transport error does not turn a completed action back into an unresolved one.

## Verification

The isolated suite adds 69 regressions: view ordering/coherence, RTDB normalization, current-token/401 handling, timeout/abort, bounded poll/cleanup, immutable persistent identity, lost responses, double clicks, reload after decisions, storage failure, read backoff/quota, anonymous auth races and SSR waiting/disabled states. Five integration cases connect the actual client session/transport to real route handlers, engine, persisted CAS adapter and Firebase SDK serialization through fakeRTDB. They cover role/reveal resume, continue/guess resume and later ack, a lost committed answer response, and next-round readiness without duplicate scoring.

The final isolated run passed 243 tests in 18 files; two opt-in real emulator tests were skipped. TypeScript, ESLint and whitespace checks passed. Production build still fails while loading next.config.ts with Windows SWC jsc.baseUrl Access denied. Browser hydration/interactive layout, real emulators and Vercel were not run or claimed as passing. No test loads live credentials for database writes. The React review checked hook/listener cleanup, derived submission flags, client/server import boundaries, recovery aria-live/alert regions, disabled controls and keyboard role selection.

F05 remains leave/presence/abandonment; F06 remains complete revealed history and notes; F07 remains lifecycle/cleanup/Rules; F08 remains browser/Vercel verification and release acceptance.
