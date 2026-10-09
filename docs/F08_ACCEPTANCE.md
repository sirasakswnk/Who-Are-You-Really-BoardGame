# F08 — Acceptance evidence and remaining gates

Checked 2026-10-09 in this checkout. **Local acceptance passes: 343 regression tests including real Auth/RTDB emulator tests, production build, and 16 browser cases. Vercel preview/release acceptance remains unverified.** Local validation used isolated emulators without production Rules writes or live database tests. F01–F07 edits remain intact.

Publication instruction, 2026-10-09: the user authorized committing/pushing the current F01–F08 work and waived Vercel testing for this push. The local results below are verified; deployed Vercel behavior and Rules remain unverified.

Story: two independently authenticated players create/join a room through the UI, send context-bound commands through Next routes into RTDB CAS, receive caller-safe projections, finish four rounds and consent to a clean rematch. Refresh, concurrent tabs, lost responses, leave and expiry must preserve that story.

## Evidence by boundary

| Boundary | Result | Evidence |
|---|---|---|
| Client controller → actual HTTP handlers | Pass in simulation and actual browser | Two independent anonymous Auth identities create/join through the UI and use production Next routes against loopback RTDB |
| Handlers → engine → independent CAS transports | Pass in simulation and real local RTDB | 343 tests in 31 passing files, no skipped tests; F02 real emulator CAS verifies concurrent joins/answers across independent transports |
| Four rounds/scoring/history/rematch | Pass in simulation and actual browser | Both viewports finish asymmetric guesses [0,3], [3,0], [1,2], [2,1], one wrong guess, scores [14,11], every phase reload and a clean rematch/restart |
| Lost response + failed read + reload | Pass in simulation; browser response-loss/offline recovery passes | Original committed answer survives reload with one SUBMIT_ANSWER receipt; simulation also covers a failed GET and preserved actionId/payload |
| SDK/Auth/RTDB Rules | Pass on local emulators | All ten previously gated tests executed: F02 two, F05/F07 five, guarded Auth/RTDB three, including onDisconnect and expiry/privacy enforcement |
| Production build | Pass | Next.js 16.4.0 Turbopack build, TypeScript, prerender and route generation completed with emulator configuration |
| Local server/emulator | Pass outside Windows sandbox | Auth 19099, RTDB 19000 and production app 3000; Firebase CLI 15.33.0, Node 24.20.0, Java 25.0.1 |
| Browser rendering/network/realtime | Pass | 16/16 executed cases on Pixel 7 (393px) and Desktop Chrome (1280px); saved-profile/invite hydration reports no page errors or hydration console errors |
| Vercel preview/production | Pending | No current deployment of these edits, no live runtime/Rules verification, no promotion |

TypeScript, ESLint and diff whitespace pass. Content's 11 tests pass within the regression suite. On Windows, the runner uses programmatic Vitest with preserveSymlinks=true, as in previous steps. Running outside the Windows sandbox resolved the earlier emulator/SWC restrictions without changing app configuration. This follow-up changes E2E tests and documentation only.

## Local run evidence — 2026-10-09

The final `npm.cmd run verify:acceptance` completed with exit code 0 against `demo-f08-c2ec3c58-79a9-4a11-98c5-21bf9d6a2b37`. Vitest reported **31 files / 343 tests passed**, the production build completed, and Playwright reported **16 passed (1.9m)**. The runner then stopped its emulators and application server.

Two test issues were corrected after inspecting actual browser failures: expiry assertions now target the game's alerts instead of Next's route announcer, and the duo fixture waits for both players' lobby state before expiring an already-open room. The added HomeCard browser regression checks saved name/avatar, invite code, reload and navigation back home, preserved storage, browser errors and horizontal overflow at both configured widths. Existing HomeCard implementation is preserved.

Home and completed-match screenshots were visually inspected. Local copies are retained under ignored `work/verification/f08/evidence/`: `home-mobile.png`, `home-invite-mobile.png`, `home-desktop.png`, `home-invite-desktop.png`, `match-result-mobile.png`, `match-result-desktop.png`, and Playwright's `.last-run.json`. These show the tested local build; they do not establish deployed Vercel behavior. Failure traces for the original expiry selectors/fixture are retained separately under ignored `work/verification/f08/`.

## Reproducible emulator/browser runner

Requirements: Node 24, Java 21+, installed Firebase CLI, installed Playwright Chromium, and permission to bind local ports 19000/19099/3000. From the repo's package.json directory:

```powershell
# Test inventory only: no emulator, browser, build or database writes
npm.cmd run verify:acceptance -- --list

# Real local Auth/RTDB SDK, Rules and CAS tests
npm.cmd run verify:acceptance -- --unit

# Real emulator regression → production build → all browser scenarios
npm.cmd run verify:acceptance
```

The runner generates a fresh `demo-f08-<UUID>` project/namespace per run. It explicitly supplies client/server matching project and loopback URLs, overrides web credentials with empty values, enables emulator mode before building, and loads the checkout's Rules. UI is disabled. It never loads web .env into the test process. A generated config is retained under ignored work/verification/f08 for inspection. On Windows the installed Firebase CLI JS entrypoint is resolved from local npm/PATH or explicit FIREBASE_CLI_JS and launched through Node without shell interpolation. Linux CI uses firebase directly. The runner stops when regression or build fails; Playwright stops after the first failed scenario (following configured retries).

For this Windows host, Firebase CLI was installed into ignored `work/verification/f08/tools/` without changing the project's package.json or lockfile. The successful process used these temporary environment settings (run outside the sandbox if its hub port fails):

```powershell
$env:FIREBASE_CLI_JS = (Resolve-Path -LiteralPath work/verification/f08/tools/node_modules/firebase-tools/lib/bin/firebase.js).Path
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\Users\USER\AppData\Local\ms-playwright'
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-25'
$env:PATH = 'C:\Program Files\Java\jdk-25\bin;' + $env:PATH
npm.cmd run verify:acceptance
```

Next's production build reports `.env` as present, but the runner supplies all Firebase targets, emulator flags and blank live credentials first; process.env takes precedence. The test guard verifies the isolated target before SDK/network calls.

Playwright enforces the explicit F08 flag, demo project, matching namespace/URLs and loopback app/emulator hosts before SDK calls. It cannot be redirected to a Vercel URL or production database with PLAYWRIGHT_BASE_URL. It starts its own production server with reuseExistingServer=false. The fixture preserves each project's viewport/mobile options when opening two isolated contexts, observes only its caller's token, uses a loopback Admin oracle to check persisted state, and removes only its own test rooms/presence after closing clients. Extra tabs share their actor's browser context. Artifact screenshots/traces/videos remain under test-results; emulator credentials appear only in the isolated test environment.

The old firebase-connection test silently loaded .env and wrote a shared `_health_check/ping`; it now requires the explicit guarded F08 emulator target, uses named SDK apps and a unique local probe, and cleans up its own probe/apps. A normal npm test run never uses that test for live writes. Sixteen target-guard regressions cover the valid fixture and deny missing opt-in, production projects, mismatched client/server targets, remote hosts, invalid ports, real RTDB URLs, remote/credential-bearing app URLs, disabled/mismatched browser emulator settings and live credentials/API keys before network access.

CI now uses the same verify:acceptance pipeline so its build and browser share the exact generated emulator config. The Linux CI run has not been dispatched or observed here.

## Browser scenarios executed on local emulators

Eight scenarios passed on both Pixel 7 and Desktop Chrome (16 total):

1. Four asymmetric rounds, correct/wrong/final forced guesses, rendering actual revealed answer labels, reload every phase and a locked answer, full result/history, persisted first rematch consent, clean reset and restart. Expected round scores [5,2], [2,5], [4,0], [3,4].
2. Third-player rejection; no-store outsider API response; real Rules deny outsiders, parent/server/opponent-private reads and client writes.
3. Early locked guess continues to answer/ack until late opponent guesses; a second guess and final-clue continue are rejected without a game revision write.
4. Same-account second tab shares ready/locked answers; closing one connection retains the other's presence.
5. Offline → online, one committed POST whose response is lost, restored locked answer after reload and one receipt.
6. Lobby host departure transfers ownership to seat 1, a new member can join/start, and active departure abandons without extra scores; reload retains abandonment.
7. Server expiry denies API and actual public Rule reads, returns 410/no-store and disables an already-open client's commands.
8. Saved-profile/invite hydration and reload retain the profile without browser errors; returning home restores the ordinary join input. Home has no horizontal document overflow at 393px and 1280px.

These scenarios executed against the real local emulators and the production Next server. They verify the described runtime flows on Chromium's emulated mobile and desktop profiles. Deployed environment/runtime/Rules and Vercel preview behavior remain separate gates.

## Vercel release and rollback checklist

Only proceed after the user separately authorizes deployment:

- Record the reviewed commit/diff and the exact code + Rules checksums. Save a known working compatible code deployment and its Rules before promoting; no verified rollback pair has been established in this session.
- Use a separate test Firebase project/RTDB for Preview. Client/server project IDs and database URLs must match. Enable Anonymous Auth, set server-only Admin credentials, disable every emulator flag/host in the deployed app, and inspect actual runtime/build settings and repo root. Local vercel.json requests sin1; deployed settings remain unverified.
- Deploy the reviewed Rules to that explicit preview project/instance separately from the web app. Inspect the actual deployed Rules; a local file or a successful Vercel build is insufficient proof.
- On the deployed preview, verify browser → create/join API → real RTDB → both clients. Repeat four rounds/rematch, wrong/forced/early guesses, refresh, same-user tabs, response loss/retry, leave and expiry. Verify membership/private/server denial and no-store; record URL, revision/checksums, scenario outcomes and screenshots without raw tokens/private keys. Current local E2E deliberately refuses remote targets; preview testing needs a separately authorized fixture/manual run with the preview database clearly selected.
- Promote only after production build, real emulator and deployed preview gates pass. If a release breaks compatibility, restore the recorded compatible deployment and Rules pair, retain server/root/client-write denial, and recheck room reads/retries with isolated test records. Do not roll back to the pre-F03 permissive command API or broaden Rules to make a failing check pass. Do not run cleanup during this validation or delete active rooms to recover a release.

**Local F08 acceptance passes.** Vercel testing is waived for the requested Git push. Deployed Rules/runtime/env, preview behavior and a compatible code/Rules rollback pair remain unverified; this record does not claim deployed release acceptance.
