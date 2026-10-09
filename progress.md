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

## M3 — Firebase/Auth/API

- [ ] Not started

## M4 — Mobile UI

- [ ] Not started

## M5 — E2E Tests

- [ ] Not started

## M6 — GitHub + CI

- [ ] Not started

## M7 — Deployment

- [ ] Not started

## M8 — Delivery

- [ ] Not started
