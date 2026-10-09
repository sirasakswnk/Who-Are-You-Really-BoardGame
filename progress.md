# Who Are You Really? — Progress

## M0 — Bootstrap ✅

- [x] Next.js 16.4.0 + TypeScript strict + App Router initialized
- [x] React 19.3.0, ESLint configured
- [x] Design system CSS extracted from HTML template (globals.css)
- [x] SVG avatar sprite component (8 avatars)
- [x] SVG desk decoration sprites (magnifying glass, pencil, etc.)
- [x] Home page shell — full React conversion of HTML template
  - Name input with character count and validation
  - Avatar picker (8 options with radio buttons)
  - Create/Join room buttons with offline detection
  - Invite link detection (?room=CODE)
  - Peeking eyes animation following pointer
  - Stamp animation (idle → ready)
  - How to Play section with scoring table
- [x] Project folder structure: lib/game, lib/server, lib/firebase, content, tests/*
- [x] Game types defined: roles, phases, scoring, scenarios
- [x] .env.example with Firebase config placeholders
- [x] README with tech stack and setup instructions
- [x] Lint/typecheck/build verification (ESLint passed, TypeScript passed, Next.js build passed)

### Versions

| Package | Version |
|---------|---------|
| next | 16.4.0 |
| react | 19.3.0 |
| react-dom | 19.3.0 |
| typescript | ^5 |
| node types | ^20 |

## M1 — Game Engine ✅

- [x] Types + reducer/state machine + seeded tests
- [x] Scoring logic (points 5/4/3/2, wrong=0, score-once semantics, tie & winner detection)
- [x] Role pair generation (30 ordered pairs, deterministic Mulberry32 PRNG, P0 != P1)
- [x] Decision barrier (guess/continue/ack, privacy projections, forced guess at final clue)
- [x] Unit tests (29 passing tests across 3 test suites: roles, scoring, engine)
  - `roles.test.ts` (7 tests): role pairs, catalog, seeded Mulberry32 PRNG, own-role disallow
  - `scoring.test.ts` (8 tests): 5/4/3/2 points table, wrong=0, explanations, match winner/tie
  - `engine.test.ts` (14 tests): state machine transitions, barrier, forced guess at clue 4, ack requirement, projections privacy, full 4-round match & rematch
- [x] Vitest 3.2.7 installed with `npm test` script

## M2 — Content (24 scenarios) ✅

- [x] 24 authentic Thai scenarios authored across all 6 categories (4 each: travel, food, shopping, leisure, friends, daily)
- [x] Rich server-only editorial metadata (`plausibleOptionsByRole`, `rationaleByRole`, `difficulty`, `tags`)
- [x] `stripEditorial` sanitizer ensuring no editorial leakage to client payloads
- [x] Content Validator ([content/validator.ts](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/content/validator.ts)) verifying schema, options (3-4), non-empty labels, and role mapping
- [x] 15-Pair Distinguishability Coverage Analyzer & Report ([content/report.md](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/content/report.md)) — all 15 pairs $\ge 11$ distinguishing scenarios (PASS ✅)
- [x] Match Deck Selector ([lib/server/deck.ts](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/lib/server/deck.ts)) — selects 16 unique scenarios across 4 rounds without replacement, independent of roles, with single-pass option shuffle
- [x] Unit tests passed (11 tests in `content.test.ts`, 40 tests total across 4 test suites)

## M3 — Firebase/Auth/API ✅

- [x] Firebase Client SDK (`lib/firebase/client.ts`) with anonymous auth persistence and emulator connection
- [x] Firebase Admin SDK (`lib/firebase/admin.ts`) and auth token verifier (`lib/server/auth.ts`)
- [x] Realtime Database security rules (`database.rules.json`) and configuration (`firebase.json`)
  - Strict deny-by-default at root
  - Public projection readable by room members
  - Private subtree readable exclusively by `auth.uid == $uid`
  - Server subtree sealed from all clients
- [x] Authoritative Room Service (`lib/server/roomService.ts`)
  - 6-character unambiguous room code generation
  - Atomic room creation and seating (3rd player rejected atomically)
  - Reconnect / seat resumption for existing player UIDs
  - Synchronized public and private projections
  - Idempotency receipts preventing duplicate action processing
- [x] Next.js Route Handlers (`app/api/*`)
  - `POST /api/room/create`
  - `POST /api/room/join`
  - `POST /api/room/ready`
  - `POST /api/room/start`
  - `POST /api/game/action`
  - `GET /api/room/[code]`
  - `Cache-Control: no-store` on authenticated responses
- [x] Unit & Integration tests passed (10 tests in `roomService.test.ts` & `api.test.ts`, 50 tests total across 6 test suites)

## M4 — Mobile UI ✅

- [x] Responsive Detective Theme styling & layout in `app/globals.css`:
  - Authentic Detective Folder palette (cream paper, navy ink, terracotta orange, teal accents, index tabs, rubber stamps)
  - Mobile-first layout with desktop frame constraint (max 520px centered container)
  - Micro-animations (stamp pulse, dot wave, button pop, hover transforms)
- [x] Rules & Roles Quick-Reference Modal ([components/game/RulesModal.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/RulesModal.tsx)):
  - Accessible dialog with Golden Rule callout, scoring breakdown table, and 6 role descriptions
- [x] Persistent Game Header ([components/game/GameHeader.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/GameHeader.tsx)):
  - Room code copy chip, rules toggle, leave room button, round/clue progress indicators (1-4 dots), live scores
- [x] Match Lobby View ([components/game/LobbyView.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/LobbyView.tsx)):
  - Room code display & one-click invite copy, dual desk slots with avatars and ready badges, host-only start trigger
- [x] Secret Role Briefing Screen ([components/game/RoleIntroView.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/RoleIntroView.tsx)):
  - Confidential dossier card, privacy peek/hide toggle (against over-the-shoulder peeking), golden role rule, acknowledge button
- [x] Scenario Answering Screen ([components/game/AnsweringView.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/AnsweringView.tsx)):
  - Category pill & clue index indicator, scenario prompt card, 3-4 option cards with selection state, lock answer confirmation, opponent answer indicator
- [x] Side-by-Side Answer Reveal Screen ([components/game/AnswerRevealView.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/AnswerRevealView.tsx)):
  - Side-by-side comparison cards for both players' choices, clue evidence stamp, proceed button
- [x] Role Deduction & Guessing Screen ([components/game/DecidingView.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/DecidingView.tsx)):
  - Current clue point value badge (5/4/3/2 pts), scratchpad note tagging ('suspect' / 'cleared') on suspect cards, self-role elimination, confirmation modal before irreversible lock, forced guess warning on clue 4
- [x] Round Summary Screen ([components/game/RoundRevealView.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/RoundRevealView.tsx)):
  - Role reveal cards for both players, earned round points with explanations, cumulative score board, next round ready button
- [x] Match Result Screen ([components/game/MatchResultView.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/MatchResultView.tsx)):
  - Victory/defeat/tie banner with trophy illustration and score differential, 4-round breakdown history table, rematch flow & return to home
- [x] Real-time Game Coordinator ([components/game/GameContainer.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/game/GameContainer.tsx)):
  - Anonymous auth bootstrap, RTDB subscriptions with polling fallback, optimistic UI state management, state-machine driven view switcher
- [x] Next.js Room Page ([app/room/[code]/page.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/app/room/%5Bcode%5D/page.tsx)):
  - Next.js 16 Partial Prerendering compliance with Suspense boundary, metadata generation, SVG sprites injection
- [x] HomeCard Integration ([components/HomeCard.tsx](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/components/HomeCard.tsx)):
  - Connected create/join buttons to real API handlers with anonymous auth, URL query code autofill, router redirect to `/room/[code]`
- [x] UI Unit & SSR Contract Tests ([tests/unit/ui-views.test.ts](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/tests/unit/ui-views.test.ts)):
  - 9 tests passing, verifying server rendering and contract shapes for all views
  - Total test suite: 62 tests across 8 test suites (PASS ✅)
- [x] Full build verification: TypeScript strict passed, ESLint clean (0 errors, 0 warnings), Next.js production build passed (Static + Partial Prerender)

## M5 — E2E Tests & Resilience ✅

- [x] Concurrency & Race-Condition Suite ([tests/integration/resilience-concurrency.test.ts](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/tests/integration/resilience-concurrency.test.ts)):
  - 8 tests passing, verifying parallel submissions, action idempotency, data privacy projection isolation, reconnect/refresh seat preservation, and expired room rejection.
- [x] Full Playwright E2E Suite ([tests/e2e/](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/tests/e2e/)):
  - Multi-context isolated browser emulation across **Mobile Pixel 7 (393px)** and **Desktop Chrome (1280px)**.
  - `two-player-game.spec.ts`: Full loop from room creation, friend invite join, ready check, match start, role briefing, scenario question selection, answer reveal, deduction guessing, and phase advancement.
  - `resilience.spec.ts`: Session reload without room/seat loss, atomic 3rd player full room rejection, and leave room confirmation dialog redirect to home.
- [x] Robust Client-Server Resilience Enhancements:
  - Auth hydration fixed with `auth.authStateReady()`.
  - RTDB listener error callbacks preventing uncaught exceptions on permissions or offline states.
  - Full state normalization in `GameContainer` guarding against RTDB pruning empty arrays (`revealedAnswers`, `matchScores`, `rematchRequests`, sparse `players`).
- [x] Test Suite Results:
  - Vitest: 70/70 tests passing across 9 test suites (`npm test`).
  - Playwright: 8/8 tests passing across Mobile Pixel 7 and Desktop Chrome (`npx playwright test`).
  - TypeScript: Zero type errors (`npx tsc --noEmit`).
  - ESLint: Clean (0 errors, 0 warnings).
  - Next.js Production Build: Successfully generated.

## M6 — GitHub + CI

- [ ] Not started

## M7 — Deployment

- [ ] Not started

## M8 — Delivery

- [ ] Not started
