# Delivery checklist — current acceptance status

Updated 2026-10-09 after actual F08 local emulator/build/browser execution. **Local acceptance passes; not signed off for release.** The previous checklist's 70-test/8-E2E/deployment/100%-delivered statements are not evidence for the current edited checkout.

The user authorized pushing the current F01–F08 work without Vercel testing on 2026-10-09. Vercel verification is waived for this push; the deployed environment remains unverified.

| Gate | Current status | Evidence |
|---|---|---|
| Schema/serialization, atomic commands, membership/privacy | Local regression passed | F01–F03 docs and current CAS/command-security tests |
| Refresh, token retry, pending request recovery | Local regression passed | F04 docs and actual controller/route tests |
| Leave/host transfer/abandoned and presence model | Local regression, real SDK and browser passed | Emulator Rules/onDisconnect and both browser profiles |
| Revealed history/rematch/private notes | Local regression passed; history/rematch browser passed | Four-round result/history and consent/reset/restart on both browser profiles; notes persistence tested in local regressions |
| Rolling expiry/Rules/cleanup dry-run | Local regression passed; deployed Rules pending | F07 docs, expiry routes and root CAS fixture |
| Four asymmetric rounds and wrong/final guesses | Simulation and actual browser passed | 14–11 total, reload every phase, consent/reset and response-loss regressions |
| TypeScript/ESLint/content/whitespace | Passed | Current F08 checks; content's 11 tests included in 343 passing tests |
| Real Auth/RTDB/Rules tests | Passed on local emulators | All 10 gated tests executed; 343 total tests in 31 files, none skipped |
| Production build | Passed | Next.js 16.4.0 Turbopack build with isolated emulator target |
| Two-browser/mobile/desktop acceptance | Passed | 16 executed Playwright cases: 8 each at 393px/1280px |
| HomeCard saved-profile/invite hydration | Passed in actual browser | Profile/storage retained across reload; no page/hydration errors on both profiles |
| CI actual execution | Unverified | Reproducible emulator runner wired to CI; no CI dispatch/results observed |
| Current Vercel runtime/env/Rules | Unverified | No deployment of local edits or preview verification |
| Release/rollback | Pending | No verified compatible release pair or promotion |

See [F08_ACCEPTANCE.md](F08_ACCEPTANCE.md) for the successful run, screenshot evidence, reproduction commands and remaining release/rollback gates. Local emulator Rules and browser success do not establish current deployed Rules or Vercel behavior.
