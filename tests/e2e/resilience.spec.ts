import { test, expect, actor, enter, start, phase, both, click, answers, guess, reload, leave, database, rawAction } from './fixtures';
import { acceptanceEnv } from '../helpers/acceptanceEnv';

test('full room rejects outsider; API and actual Rules deny private/server/parent access and writes', async ({ duo, browser }, info) => {
  const third = await actor(browser, info);
  try {
    await third.page.goto(`/?room=${duo.code}`); await third.page.fill('#name', 'ผู้เล่นสาม');
    await third.page.locator('input[value="bear"]').check(); await third.page.click('#btn-join');
    await expect(third.page.locator('#status')).toContainText('เต็ม');
    const response = await third.context.request.get(`/api/room/${duo.code}`, { headers: { Authorization: `Bearer ${third.token()}` } });
    expect(response.status()).toBe(403); expect(response.headers()['cache-control']).toBe('no-store');
    const target = acceptanceEnv(), uid = duo.host.uid(), other = duo.guest.uid();
    const request = async (path: string, token = duo.host.token(), method = 'GET') => {
      const url = new URL(target.databaseURL); url.pathname = `/${path}.json`; url.searchParams.set('auth', token);
      return duo.host.context.request.fetch(url.toString(), { method, ...(method === 'PUT' ? { data: { unsafe: true } } : {}) });
    };
    for (const path of [`rooms/${duo.code}/public`, `rooms/${duo.code}/members`, `rooms/${duo.code}/private/${uid}`]) {
      expect((await request(path)).ok()).toBe(true); expect((await request(path, third.token())).ok()).toBe(false);
    }
    for (const path of ['', `rooms/${duo.code}`, `rooms/${duo.code}/server`, `rooms/${duo.code}/private/${other}`]) {
      expect((await request(path)).ok()).toBe(false); expect((await request(path, duo.host.token(), 'PUT')).ok()).toBe(false);
    }
  } finally { await third.context.close(); }
});

test('locked early guess still answers and acknowledges until opponent guesses; no second guess/forced continue', async ({ duo }) => {
  await start(duo); await both(duo, '.acknowledge-role-btn'); await answers(duo);
  const role = (await duo.room()).private[duo.guest.uid()].role!;
  await guess(duo.host, role); await click(duo.guest, '.continue-clue-btn'); await phase(duo, 'ANSWERING');
  await answers(duo); await expect(duo.host.page.locator('.already-guessed-panel')).toBeVisible();
  const before = (await duo.room()).server.revision;
  const duplicate = await rawAction(duo, duo.host, { type: 'SUBMIT_DECISION', decision: { type: 'guess', roleId: role } });
  expect(duplicate.status()).toBe(400); expect((await duo.room()).server.revision).toBe(before);
  await click(duo.guest, '.continue-clue-btn'); await expect.poll(async () => (await duo.room()).public.phase).toBe('DECIDING');
  await click(duo.host, '.proceed-btn'); await phase(duo, 'ANSWERING');
  await answers(duo); await click(duo.host, '.proceed-btn'); await click(duo.guest, '.continue-clue-btn');
  await phase(duo, 'ANSWERING'); await answers(duo);
  expect((await rawAction(duo, duo.guest, { type: 'SUBMIT_DECISION', decision: { type: 'continue' } })).status()).toBe(400);
  await click(duo.host, '.proceed-btn'); await guess(duo.guest, (await duo.room()).private[duo.host.uid()].role!);
  await phase(duo, 'ROUND_REVEAL'); expect((await duo.room()).public.roundSummary?.scores).toEqual([5, 2]);
});

test('same-account tabs share ready/locked answers and one tab closing keeps presence online', async ({ duo }) => {
  const extra = await duo.host.context.newPage(); await extra.goto(`/room/${duo.code}`);
  await expect(extra.locator('.lobby-container')).toBeVisible();
  const presence = async () => await database(`presence/${duo.code}/${duo.host.uid()}`) as Record<string, true> | null;
  await expect.poll(async () => Object.keys(await presence() ?? {}).length).toBe(2);
  await click(duo.host, '.lobby-ready-btn'); await expect(extra.locator('.lobby-ready-btn')).toContainText('ยกเลิก');
  await extra.close(); await expect.poll(async () => Object.keys(await presence() ?? {}).length).toBe(1);
  await click(duo.guest, '.lobby-ready-btn'); await click(duo.host, '.lobby-start-btn');
  await phase(duo, 'ROLE_INTRO'); await both(duo, '.acknowledge-role-btn'); await phase(duo, 'ANSWERING');
  const otherTab = await duo.host.context.newPage(); await otherTab.goto(`/room/${duo.code}`);
  await expect(otherTab.locator('.answering-container')).toBeVisible();
  await duo.host.page.locator('.option-card').first().click(); await click(duo.host, '.submit-answer-btn');
  await expect(otherTab.locator('.answer-submitted-banner')).toBeVisible();
  await expect(otherTab.locator('.option-card').first()).toBeDisabled(); await otherTab.close();
});

test('offline and lost POST response recover the original committed answer without an extra action', async ({ duo }) => {
  await start(duo); await both(duo, '.acknowledge-role-btn'); await phase(duo, 'ANSWERING');
  await duo.host.context.setOffline(true); await expect(duo.host.page.locator('.submit-answer-btn')).toBeDisabled();
  await duo.host.context.setOffline(false);
  let lost = false;
  await duo.host.page.route('**/api/game/action', async route => {
    const response = await route.fetch();
    if (!lost && route.request().postDataJSON().action.type === 'SUBMIT_ANSWER') { lost = true; await route.abort('failed'); }
    else await route.fulfill({ response });
  });
  await duo.host.page.locator('.option-card').first().click(); await click(duo.host, '.submit-answer-btn');
  await expect(duo.host.page.locator('.answer-submitted-banner')).toBeVisible();
  await expect.poll(() => lost).toBe(true);
  await reload(duo.host, '.answering-container'); await expect(duo.host.page.locator('.answer-submitted-banner')).toBeVisible();
  const receipts = Object.values((await duo.room()).server.receipts).filter(item => item.uid === duo.host.uid() && item.type === 'SUBMIT_ANSWER');
  expect(lost).toBe(true); expect(receipts).toHaveLength(1);
  await duo.guest.page.locator('.option-card').nth(1).click(); await click(duo.guest, '.submit-answer-btn'); await phase(duo, 'ANSWER_REVEAL');
});

test('host departure transfers lobby ownership; active departure abandons without new scores', async ({ duo }) => {
  await leave(duo.host); await expect(duo.guest.page.locator('.lobby-start-btn')).toBeVisible();
  const remaining = (await duo.room()).members[duo.guest.uid()]; expect(remaining.isHost).toBe(true); expect(remaining.seat).toBe(1);
  await enter(duo.host, 'กลับมาอีกครั้ง', duo.code);
  await Promise.all([duo.host, duo.guest].map(player => click(player, '.lobby-ready-btn')));
  await click(duo.guest, '.lobby-start-btn'); await phase(duo, 'ROLE_INTRO');
  const before = (await duo.room()).public.matchScores; await leave(duo.host);
  await expect(duo.guest.page.getByRole('heading', { name: 'เกมยุติแล้ว' })).toBeVisible();
  expect((await duo.room()).public.phase).toBe('ABANDONED'); expect((await duo.room()).public.matchScores).toEqual(before);
  await reload(duo.guest, '.error-box'); await expect(duo.guest.page.getByRole('heading', { name: 'เกมยุติแล้ว' })).toBeVisible();
});

test('expiry denies API and Rules and disables an already open client', async ({ duo }) => {
  await database(`rooms/${duo.code}/server/expiresAt`, 'PUT', Date.now() - 1000);
  await duo.host.page.reload(); await expect(duo.host.page.locator('.game-error-screen').getByRole('alert')).toContainText('หมดอายุ', { timeout: 20_000 });
  const response = await duo.host.context.request.get(`/api/room/${duo.code}`, { headers: { Authorization: `Bearer ${duo.host.token()}` } });
  expect(response.status()).toBe(410); expect(response.headers()['cache-control']).toBe('no-store');
  const target = acceptanceEnv(), url = new URL(target.databaseURL); url.pathname = `/rooms/${duo.code}/public.json`; url.searchParams.set('auth', duo.host.token());
  expect((await duo.host.context.request.get(url.toString())).ok()).toBe(false);
  await expect(duo.guest.page.locator('.room-recovery-banner')).toContainText('หมดอายุ', { timeout: 20_000 });
  await expect(duo.guest.page.locator('.lobby-ready-btn')).toBeDisabled();
});
