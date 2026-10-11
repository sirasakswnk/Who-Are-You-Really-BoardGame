# Who Are You Really? — Progress

> อัปเดต 2026-10-10: เกมใหม่ใช้ `hidden-identities-v1` (6 ตัวตนลับ / 16 ข้อ / packs A–D) รายการ M0–M8 ด้านล่างเป็นประวัติงานเดิม ไม่ใช่ผล balance หรือผลตรวจ release ของชุดใหม่ ดูผลล่าสุดใน [content/report.md](content/report.md)

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

## M6 — GitHub + CI ✅

- [x] Verified remote Git repository: `https://github.com/sirasakswnk/Who-Are-You-Really-BoardGame.git` on branch `master`.
- [x] Created GitHub Actions CI workflow ([`.github/workflows/ci.yml`](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/.github/workflows/ci.yml)):
  - Least-privilege permissions: `permissions: contents: read`.
  - Pinned actions: `checkout@v4`, `setup-node@v4`, `setup-java@v4`, `upload-artifact@v4`.
  - Hermetic test environment: Uses Firebase Local Emulator Suite (Auth 9099 + RTDB 9000 with real `database.rules.json`) and mock credentials — no production secrets required or leaked on CI.
  - Automated pipeline: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run validate:content` → `npm test` (with emulators) → `npm run build` → `npx playwright test` (with emulators).
- [x] Enhanced `package.json` scripts: Added `typecheck` and `validate:content`.
- [x] Resilient test environment: Enhanced `tests/integration/firebase-connection.test.ts` to seamlessly adapt to both live `.env` credentials and CI Firebase Emulator.
- [x] Updated `README.md` with CI status badge and verified local commands.

## M7 — Deployment (Vercel + Firebase) ✅

- [x] Bound Firebase project: Created [`.firebaserc`](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/.firebaserc) with project `who-are-you-really-e6584`.
- [x] Deployed live Firebase Realtime Database Security Rules (`database.rules.json`): Verified syntax and released successfully to `who-are-you-really-e6584-default-rtdb` (region `asia-southeast1`).
- [x] Optimized serverless latency: Created [`vercel.json`](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/vercel.json) setting execution region to `sin1` (Singapore) to minimize latency to Firebase RTDB.
- [x] Vercel Environment Variables specification prepared: Clean split between browser (`NEXT_PUBLIC_*`) and server-only (`FIREBASE_*`) admin credentials.
- [x] Full validation suite passed against live rules: 70/70 Vitest tests pass, TypeScript strict clean, ESLint clean, Next.js build clean.

## M8 — Delivery (ส่งมอบงาน) ✅

- [x] Comprehensive Operational Manual ([`README.md`](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/README.md)):
  - Full game rules, 6 roles, Golden Rule, and 5/4/3/2 scoring schedule.
  - Setup, dev (`npm ci`, `npm run dev`), testing locally with 2 browser sessions, and mobile LAN Wi-Fi play (`http://<LAN_IP>:3000`).
  - Firebase Local Emulator Suite manual (`firebase emulators:start`).
  - Complete testing commands list (lint, typecheck, validate content, vitest, playwright, build).
  - Deployment manual: Explaining rules deployment separation from web app, Vercel Git Integration, environment variables table, and authorized domains.
  - Content Authoring & Extension Guide: Step-by-step instructions for adding new scenarios, schema requirements, editorial metadata, and running `npm run validate:content`.
  - Explicit known limitations: Honor system, playtest balance, device-bound sessions, memory TTL cleanup.
- [x] Official Delivery & Audit Checklist ([`docs/DELIVERY_CHECKLIST.md`](file:///d:/Vscode/BoardGame/Who%20Are%20You%20Really/gemini/who-are-you-really/docs/DELIVERY_CHECKLIST.md)):
  - Verified completion of all Milestones (M0 Bootstrap through M8 Delivery).
  - 100% compliance with `plan.md` Section 10 (Definition of Done).
  - Cleanliness audit passed: Zero production mocks, zero TODO/FIXME items, zero toast-only stubs, zero secret leaks.
- [x] All 70 Vitest unit/concurrency tests + 8 Playwright E2E tests + TypeScript strict + ESLint + Next.js build passed.
- [x] Project state: **Fully delivered and production-ready! 🚀**


## Content update — 2026-10-10

- เปลี่ยนบท/คำถามตาม canonical JSON ใน `codex-content-update.md` โดยคงข้อความทั้งหมด; ชุดเก่าแยกเป็น legacy
- เพิ่ม contentVersion และตัวอ่านห้องเก่า: active match เดิมเล่น snapshot/บทเดิมจนจบ; lobby/rematch ใหม่ใช้ hidden-identities-v1; ไม่ map IDs ไม่ล้าง Firebase Auth หรือห้องจริง
- จอง packs A–D ครบตั้งแต่เริ่มเกม สุ่มลำดับชุดอิสระจากบทและคงลำดับข้อภายในชุด คะแนน/เฟสและ private guess barrier คงเดิม
- อัปเดต role cards/picker/help/reveal/history/preview, notes cache, validators และ fixtures/tests
- ผลตรวจ: 373 Vitest tests ผ่านเมื่อเปิด local Auth/RTDB Emulator; focused two-player Playwright ผ่าน 2 cases (mobile/desktop); lint/typecheck/content validation/build ผ่าน; preview ตรวจ 320/393/1280 px ไม่ล้นแนวนอน ชื่อไทยยาวแสดงครบ
- ยังไม่รับรอง balance/playtest; ไม่ได้รัน Playwright specs อื่น ไม่ commit/push/deploy และไม่แก้ production database

## Role portraits — 2026-10-11

- เก็บ PNG ต้นฉบับแบบไม่เปลี่ยนข้อมูลใน `assets/roles/hidden-identities-original.png`; SHA-256 ตรงกับไฟล์ที่ผู้ใช้แนบ
- แยก 6 บทตาม role ID เป็น lossless WebP ขนาด 512 × 512 ใน `public/images/roles`; ครอปชื่ออังกฤษออก คงภาพประกอบ/พื้นหลังและสัดส่วน มี crop manifest และ script สำหรับสร้างซ้ำ
- ใช้ภาพในคู่มือรวมบท บัตรส่วนตัว/ปุ่มทบทวนบท หน้าเลือกคำทาย หน้าเฉลยประจำรอบ และประวัติหลังจบเกม; ชื่อไทย/คำอธิบายยังเป็น HTML จาก catalog เดิม ห้อง legacy ใช้ภาพตกแต่งเดิม ไม่สลับบท
- คงเงื่อนไขซ่อนบทบาทเดิม ไม่แก้เกม คะแนน เฟส API ข้อมูล Firebase Rules หรือ Auth; ซ่อนบัตรแล้วภาพและชื่อถูกนำออกจากบัตร
- ผลตรวจ: typecheck และ lint ไฟล์ที่แก้ผ่าน; UI/reminder/history projection/security/hydration tests ผ่าน 120 ข้อ; Chromium preview ผ่าน 64 กรณี รวมทั้ง 6 บทที่ 320/393/1280 px และกล่องทบทวนบทแนวนอน 667 × 375 px ไม่พบภาพยืด ภาพโหลดเสีย page error หรือ overflow แนวนอน
- หลักฐานหน้าจอ/ผลตรวจอยู่ใน `work/verification/content-update/role-images/`; ตรวจด้วย browser viewport จำลอง ยังไม่ได้ตรวจบนโทรศัพท์จริง ไม่ commit/push/deploy

## Deciding mobile UI/UX — 2026-10-11

- เปลี่ยนบัตรผู้ต้องสงสัยเป็นรายการแนวนอนบนมือถือ ใช้ native radio เลือกทีละบท แยกปุ่มเปิดรายละเอียด; กรองบทตัวเองออกจริงและรอโหลดบทก่อนให้ทาย
- เพิ่ม shortDescription ใน presentation mapping โดยคง catalog เต็มและใช้ description เดิมเป็น fallback สำหรับห้อง legacy
- รายละเอียดเป็น native dialog / bottom sheet พร้อมรูป ชื่อ คำอธิบายเต็ม และบันทึกส่วนตัวเดิม; บัตรแสดงเฉพาะ badge สงสัย/ตัดออก การเปิดรายละเอียดและบันทึกไม่เปลี่ยนคำทาย และบทที่ตัดออกยังเลือกได้
- ย่อหลักฐานให้คำตอบเพื่อนแสดงทันที ส่วนคำถามขยายได้; แถบตัดสินใจติดล่างมือถือ วัดความสูงจริงด้วย ResizeObserver รวมข้อความหลายบรรทัดและ safe area เพื่อไม่บังบัตรสุดท้าย
- คง guess/continue/ack payload และ confirmation เดิม เพิ่มตัวกันส่งซ้ำระหว่างรอและรักษาคำทายเมื่อส่งล้มเหลว; ใช้ key ของ match/round ที่ GameContainer มีอยู่แล้ว ไม่ reset จาก presence update
- ผลตรวจ: lint, typecheck และ production build ผ่าน; focused Vitest ผ่าน 123 tests ใน 5 files; Playwright UI ผ่าน 20 cases ที่ 360×780, 390×844, 430×932, 390×480 และ desktop 1280×900
- Browser coverage รวม single selection/keyboard, แยก details/notes, Escape/focus containment/คืน focus, footer ไม่บังบัตรสุดท้าย, confirmation ยกเลิก/ส่งครั้งเดียว, ส่งล้มเหลว/ลองใหม่, เปลี่ยนรอบ/เกม, ข้อสุดท้าย, สถานะทายแล้ว/ส่งแล้ว/blocked, loading และ legacy fallback; ไม่พบ page error หรือ horizontal overflow ในกรณีที่ตรวจ
- ภาพหลังแก้ทั้งรายการที่เลือกแล้ว แผงรายละเอียด และ confirmation ของแต่ละขนาดอยู่ใน `work/verification/content-update/deciding-mobile/`; ตรวจภาพมือถือ จอสั้น และ desktop แล้ว
- ข้อจำกัด: เป็น Chromium viewport จำลองและ component callbacks สำหรับกรณี request ล่าช้า/ล้มเหลว ไม่ได้ทดสอบบนโทรศัพท์จริงหรือ Safari และไม่ได้รัน Firebase multiplayer E2E ทั้งชุดในงานนี้; ไม่ commit/push/deploy ไม่แก้ backend หรือข้อมูล production
