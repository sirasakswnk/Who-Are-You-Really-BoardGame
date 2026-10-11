# Content update — hidden-identities-v1

Active content now uses six hidden identities: alien, spy, vampire, time_traveler, thief, ghost. The canonical Thai descriptions, 16 scenarios and 64 options are preserved exactly from `codex-content-update.md`. `content/hidden-identities-v1.json` holds the full dataset; the role-only JSON is its public catalog projection, kept separate so client imports do not include the match packs.

The server reserves packs A–D at match start, shuffles pack order independently of roles, preserves the four clues inside each pack, and shuffles options once with stable IDs. Unused clues from an early-ended round stay unused. No correct-answer mappings, option restrictions, automatic role reveal or option scoring were added.

Existing active matches without `contentVersion` infer `personality-v1` from their original role IDs. Their persisted scenario/deck snapshots, guesses and history keep their original meaning. New rounds within those matches use the legacy role catalog. Old unstarted lobbies and rematches start `hidden-identities-v1`. The original 24-question catalog and previous editorial report are archived under `content/legacy/`; they are not selected for new matches. Notes and view state are scoped by contentVersion + matchId + roundId; legacy pending guesses remain recoverable and Firebase Auth is untouched.

Scoring remains 5/4/3/2 for a correct guess after clues 1–4, zero for wrong guesses, with one guess per player per round and the original private decision barrier. Firebase Rules and production data are unchanged. There is no database seed/migration to run because content is file-based.

Verification on 2026-10-10:

- Exact JSON comparison against the brief: all roles, prompts, options and packs match. The supplied brief file is unchanged.
- `npm.cmd test`: 363 passed, 10 skipped when emulators were not configured.
- `npm.cmd run verify:acceptance -- --unit` with the existing local Firebase CLI: all 373 passed, including the 10 Auth/RTDB emulator tests. The emulator used an isolated demo project, with no production credentials.
- Regression coverage includes legacy reload across all four rounds, preserved option/deck snapshots, private guesses/revisions, a guessed player continuing to answer, forced final-clue guessing, early round end, rematch, cross-version rejection and version-scoped notes. All six active identities can answer every option in all 16 questions without automatic reveal or extra points.
- `npm.cmd run typecheck`, `npm.cmd run lint`, content integrity validation and production build pass. Ignored local verification tools/snapshots are excluded from TypeScript/ESLint checks; application source remains checked.
- Browser preview checks at 320, 393 and 1280 pixels: five affected game screens per viewport plus all six guide cards; no horizontal page overflow or page errors. The complete Thai time-traveler name wraps on narrow screens.
- Focused two-player Playwright E2E (`tests/e2e/two-player-game.spec.ts`) on an isolated emulator and local app at port 3100: **2 passed**, Mobile Pixel 7 (393px) and Desktop Chrome (1280px). Both completed four asymmetric rounds, wrong/forced guesses, reloads at every phase, history/score checks and two-player rematch. Stale result-table assertions were updated to check the existing expandable round files and their individual scores; no gameplay change was required. Other Playwright specifications were not run in this update.

Balance status: **unassessed**. This is an initial playtest dataset. Vampire/ghost choices may overlap; repeated valuable-object choices may make the thief conspicuous; alien social customs versus the time traveler's unfamiliar technology needs player testing. No questions were edited to claim a balance pass. `legacy/report.md` is historical editorial coverage, not evidence of balance for this version.

No commit, push, deploy or production migration was performed for this update.
