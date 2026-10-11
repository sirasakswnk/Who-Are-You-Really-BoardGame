# Content Distinguishability Coverage Report

- **Total Scenarios**: 24 (6 categories × 4 scenarios)
- **Total Unordered Role Pairs**: 15 ($C(6, 2)$)
- **Minimum Distinguishing Scenarios per Pair**: 11 / 24 (all pairs $\ge 10$)
- **Validation Status**: PASS ✅

## Pairwise Distinguishability Breakdown

| Role Pair | Distinguishing Scenarios | Coverage % |
|---|---|---|
| saver vs comfort | 21 / 24 | 88% |
| saver vs explorer | 23 / 24 | 96% |
| saver vs companion | 22 / 24 | 92% |
| saver vs impatient | 20 / 24 | 83% |
| saver vs cautious | 17 / 24 | 71% |
| comfort vs explorer | 24 / 24 | 100% |
| comfort vs companion | 21 / 24 | 88% |
| comfort vs impatient | 21 / 24 | 88% |
| comfort vs cautious | 19 / 24 | 79% |
| explorer vs companion | 22 / 24 | 92% |
| explorer vs impatient | 18 / 24 | 75% |
| explorer vs cautious | 24 / 24 | 100% |
| companion vs impatient | 23 / 24 | 96% |
| companion vs cautious | 19 / 24 | 79% |
| impatient vs cautious | 23 / 24 | 96% |

## Category Distribution

- **travel**: 4 scenarios (rain, hotel-full, transport, plan-change)
- **food**: 4 scenarios (queue, group-pick, new-menu, rush)
- **shopping**: 4 scenarios (delivery, repair, unfamiliar, trip-gear)
- **leisure**: 4 scenarios (day-off, new-activity, crowded-event, one-hour)
- **friends**: 4 scenarios (late, disagree, budget, spontaneous)
- **daily**: 4 scenarios (queue, route-detour, chores, problem-service)

## Security & Data Boundaries

- Editorial metadata (`plausibleOptionsByRole`, `rationaleByRole`, `difficulty`, `tags`) is maintained strictly server-side.
- The `stripEditorial()` utility removes all metadata before questions are delivered to client sessions.
- Match deck selection (`selectMatchDeck`) selects 16 questions randomly across 4 rounds without replacement, independent of player role assignments, preventing thematic role leaks.
