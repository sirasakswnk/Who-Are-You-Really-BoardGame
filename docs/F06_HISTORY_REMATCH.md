# F06: Revealed history, rematch and round notes

Implemented locally on 2026-10-09. No deployment, live writes or Rules changes in this step. F01–F05 work is preserved. F07/F08 remain separate steps.

## Revealed content contract

The engine captures evidence at round completion alongside the score-once history entry. Each evidence item contains clue index, scenario ID/version, prompt and the two revealed answer labels, taken from that round's persisted scenario snapshot. Later catalog changes or repeated option IDs in different questions cannot substitute text. The snapshot contains only clues that were actually answered and revealed; it contains no future scenarios, editorial metadata or unresolved decisions.

Public projections now include `revealedEvidence` for current-round revealed answers and `roundHistory` for completed rounds. The history allowlist contains roles, locked guesses, guess clue indices, round scores/reasons and captured evidence. Prior completed rounds remain available while the next round is active; current-round roles/guesses stay private until the round completes. Existing option-ID `revealedAnswers` is retained for compatibility; the UI renders the text evidence instead of those IDs. The room/client decoders support RTDB sparse numeric maps, zero indices and legacy missing history/evidence, and reject malformed or future history entries.

GameContainer supplies the server history to MatchResultView instead of an empty array. The result table shows all four round scores/roles; expandable details show the prompt, both answers, guesses, their timing and the scoring reasons. AnswerRevealView resolves earlier clues from their own evidence snapshots, not the current question's option list. Unavailable labels are never rendered as raw option IDs.

Pre-F06 records did not retain earlier rounds' answers. If the legacy result still matches the current completed round, evidence can be rebuilt from its retained round snapshot. Older completed rounds whose answers were discarded retain their actual roles/guesses/scores with an explicit unavailable-evidence message; the system does not invent historical choices or replace them with today's catalog. No bulk migration or database deletion occurs.

## Rematch

Both persisted REMATCH_REQUEST flags are required. One request keeps MATCH_RESULT and its history. On the second request the room transaction creates a fresh matchId, returns to LOBBY, clears scores/history/current round/ready/rematch flags/termination and the match deck. Caller-private role/guess/answer/ack/decision/next-round flags are rebuilt empty. Starting that new match draws fresh roles and a fresh shuffled deck on the server; individual roles/questions can recur under the existing random-selection rules.

F03 receipts remain retained for safe retries. A previously successful request can replay its result without applying old state; a new old-match request cannot change the rematch. F04 client context reconciliation clears completed pending commands, while match/round/phase/clue keys clear selected options/roles/modals. Independent public/private revisions prevent an old match response from restoring its screen. The existing F05 two-member rematch check remains in place.

## Private suspicion notes

DecidingView's suspicion tags are now controlled by a room-level RoundNotes controller, so unmounting the decision phase or changing clues does not erase them. One versioned localStorage record per uid/room stores only current matchId/roundId, a public ordering revision and at most six suspicion/cleared marks. Reads are bounded/validated; tokens, actual roles, answers and pending guesses are not stored there or sent to the server.

Coherent new-round/rematch-lobby state replaces the prior notes with an empty record. An older tab cannot overwrite a newer context's record, and a lagging same-round edit cannot lower its revision. Storage events reload the caller's notes and refresh room state; listener cleanup belongs to that mounted room. Same-round edits merge with the latest observed record, with ordinary localStorage last-write behavior for truly simultaneous edits. These scratchpad marks never affect the authoritative game state.

When localStorage is blocked, notes survive phase changes in that live controller and reset with its context, but do not survive a full reload. A fresh controller publishes its initial empty/restored notes so another room/account cannot inherit the previous component's visible marks.

## Verification and limits

- 297 isolated local tests pass in 23 files, including 18 new F06 regressions. Seven real emulator tests remain skipped (the existing F02 CAS 2 and F05 Rules/SDK 5); no live-credential firebase-connection test was run.
- Three new integration tests exercise actual client sessions, token-aware HTTP transport, routes, engine and CAS/fakeRTDB with real Firebase serialization. They play four rounds at guess timings 1–4 (5/4/3/2, total 14), compare all content/history/scores after reload, recover a lost rematch response, verify both-player consent and full reset, order multiple tabs, block old commands and verify a newly generated deck.
- Projection/decoder regressions check unrevealed answers/roles and future scenarios, retained completed history, legacy evidence limits and malformed RTDB values. Notes tests cover round/rematch reset, reload, actor/room isolation, stale tabs and blocked storage. SSR tests check rendered labels, full history and persisted suspicion tags.
- TypeScript, ESLint and diff whitespace pass. The React review covers controlled server flags, derived history, type-only imports, versioned bounded storage, listener cleanup, aria-pressed tags and native accessible details/summary controls.
- Production build remains blocked before application compilation by Windows SWC `Access is denied` while canonicalizing jsc.baseUrl/loading next.config.ts. Browser hydration/layout/storage events/E2E and Vercel have not been verified or deployed. Real emulator startup was blocked during F05 by Windows loopback permission; that environment has not been changed in F06.

Next: F07 rolling expiry, Rules audit and dry-run cleanup. Full browser/emulator/Vercel acceptance stays F08.
