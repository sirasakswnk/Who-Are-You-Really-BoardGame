import { ROLE_IDS } from '../../lib/game/types';
import { getRoleInfo } from '../../lib/game/types';
import { test, expect, phase, click, both, start, guess, reload } from './fixtures';

test('four asymmetric rounds, wrong/forced guesses, reload every phase, history and two-player rematch', async ({ duo }, info) => {
  const { host, guest } = duo;
  const reloadBoth = (selector: string) => Promise.all([host, guest].map(player => reload(player, selector)));
  await reloadBoth('.lobby-container'); await start(duo);
  const timings = [[0, 3], [3, 0], [1, 2], [2, 1]];
  const earned = [[5, 2], [2, 5], [4, 0], [3, 4]];
  for (let r = 0; r < 4; r++) {
    await phase(duo, 'ROLE_INTRO'); if (r === 0) await reloadBoth('.role-intro-container');
    const before = await duo.room(), roleHost = before.private[host.uid()].role!, roleGuest = before.private[guest.uid()].role!;
    expect(roleHost).not.toBe(roleGuest);
    await Promise.all([host, guest].map(async (player, seat) => {
      await expect(player.page.locator('.secret-role-name')).toContainText(getRoleInfo(seat === 0 ? roleHost : roleGuest).name);
    }));
    await both(duo, '.acknowledge-role-btn');
    for (let c = 0; c <= Math.max(...timings[r]); c++) {
      await phase(duo, 'ANSWERING');
      if (r === 0 && c === 0) await reloadBoth('.answering-container');
      await host.page.locator('.option-card').first().click(); await click(host, '.submit-answer-btn');
      if (r === 0 && c === 0) {
        await reload(host, '.answering-container'); await expect(host.page.locator('.answer-submitted-banner')).toBeVisible();
        await expect(host.page.locator('.option-card').first()).toBeDisabled();
      }
      await guest.page.locator('.option-card').nth(1).click(); await click(guest, '.submit-answer-btn');
      await phase(duo, 'ANSWER_REVEAL');
      const evidence = (await duo.room()).public.revealedEvidence.find(item => item.clueIndex === c)!;
      await expect(host.page.locator('.my-card .reveal-answer-box')).toHaveText(evidence.answers[0]);
      await expect(guest.page.locator('.my-card .reveal-answer-box')).toHaveText(evidence.answers[1]);
      if (r === 0 && c === 0) await reloadBoth('.reveal-container');
      await both(duo, '.proceed-decide-btn'); await phase(duo, 'DECIDING');
      if (r === 0 && c === 0) await reloadBoth('.deciding-container');
      if (c === 3) {
        const unguessed = timings[r][0] === 3 ? host : guest;
        await expect(unguessed.page.locator('.forced-guess-alert')).toBeVisible();
        await expect(unguessed.page.locator('.continue-clue-btn')).toHaveCount(0);
      }
      await Promise.all([host, guest].map(async (player, seat) => {
        if (c < timings[r][seat]) await click(player, '.continue-clue-btn');
        else if (c > timings[r][seat]) await click(player, '.proceed-btn');
        else {
          const role = r === 2 && seat === 1 ? ROLE_IDS.find(id => id !== roleHost && id !== roleGuest)! : seat === 0 ? roleGuest : roleHost;
          await guess(player, role);
        }
      }));
    }
    await phase(duo, 'ROUND_REVEAL'); expect((await duo.room()).public.roundSummary?.scores).toEqual(earned[r]);
    if (r === 0) await reloadBoth('.round-reveal-container');
    await both(duo, '.next-round-btn');
  }
  await phase(duo, 'MATCH_RESULT'); await reloadBoth('.match-result-container');
  const completed = await duo.room(); expect(completed.public.matchScores).toEqual([14, 11]);
  expect(completed.public.roundHistory).toHaveLength(4);
  await expect(host.page.locator('details.match-round')).toHaveCount(4);
  for (const [index, scores] of earned.entries()) {
    await expect(host.page.locator('details.match-round').nth(index).locator('.match-round-score').nth(0)).toContainText(`+${scores[0]}`);
    await expect(host.page.locator('details.match-round').nth(index).locator('.match-round-score').nth(1)).toContainText(`+${scores[1]}`);
  }
  await expect(host.page.getByRole('region', { name: 'คะแนนรวมทั้งเกม' })).toContainText('14');
  await expect(host.page.getByRole('region', { name: 'คะแนนรวมทั้งเกม' })).toContainText('11');
  await host.page.screenshot({ path: info.outputPath('match-result.png'), fullPage: true });
  const oldMatch = completed.public.matchId; await click(host, '.rematch-btn');
  expect((await duo.room()).public.phase).toBe('MATCH_RESULT');
  await reload(host, '.match-result-container'); await expect(host.page.locator('.rematch-btn')).toBeDisabled();
  await click(guest, '.rematch-btn'); await phase(duo, 'LOBBY');
  const rematch = await duo.room(); expect(rematch.public.matchId).not.toBe(oldMatch);
  expect(rematch.public.matchScores).toEqual([0, 0]); expect(rematch.public.roundHistory).toEqual([]);
  expect(rematch.public.players.every(player => player?.ready === false)).toBe(true);
  await start(duo); expect((await duo.room()).public.roundHistory).toEqual([]);
});
