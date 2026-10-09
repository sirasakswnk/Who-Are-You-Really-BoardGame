import { randomUUID } from 'node:crypto';
import { test as base, expect, type BrowserContext, type Page, type TestInfo, type Browser } from '@playwright/test';
import { acceptanceEnv } from '../helpers/acceptanceEnv';
import { decodeRoomRecord } from '../../lib/server/roomSchema';
import type { RoomRecord } from '../../lib/server/roomRecord';
import type { RoleId } from '../../lib/game/types';
import { ROLES } from '../../lib/game/types';

const target = acceptanceEnv();
export { expect };
export interface Actor { context: BrowserContext; page: Page; token: () => string; uid: () => string }
export interface Duo { host: Actor; guest: Actor; code: string; room: () => Promise<RoomRecord> }
export async function database(path: string, method = 'GET', value?: unknown) {
  const url = new URL(target.databaseURL); url.pathname = `/${path.split('/').map(encodeURIComponent).join('/')}.json`;
  const response = await fetch(url, { method, headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: value === undefined ? undefined : JSON.stringify(value), signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Local fixture database HTTP ${response.status}`);
  return response.json();
}
export async function actor(browser: Browser, info: TestInfo): Promise<Actor> {
  const use = info.project.use;
  const context = await browser.newContext({ baseURL: target.baseURL.toString(), viewport: use.viewport,
    isMobile: use.isMobile, deviceScaleFactor: use.deviceScaleFactor, hasTouch: use.hasTouch, userAgent: use.userAgent });
  const page = await context.newPage(); let token = '';
  page.on('request', request => {
    if (new URL(request.url()).pathname.startsWith('/api/')) token = request.headers()['authorization']?.replace(/^Bearer /, '') || token;
  });
  return { context, page, token: () => token, uid: () => {
    if (!token) throw new Error('No actor token observed');
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return claims.user_id ?? claims.sub;
  } };
}
export async function enter(player: Actor, name: string, code?: string) {
  await player.page.goto(code ? `/?room=${code}` : '/');
  await player.page.fill('#name', name);
  await player.page.locator(`input[value="${code ? 'fox' : 'cat'}"]`).check();
  await player.page.locator(code ? '#btn-join' : '#btn-create').click();
  await expect(player.page).toHaveURL(/\/room\/[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/, { timeout: 20_000 });
  return new URL(player.page.url()).pathname.split('/').pop()!;
}
export const test = base.extend<{ duo: Duo }>({
  duo: async ({ browser }, provide, info) => {
    const host = await actor(browser, info), guest = await actor(browser, info); let code: string | undefined;
    try {
      code = await enter(host, 'นักสืบเอก'); await enter(guest, 'นักสืบโท', code);
      await expect(host.page.locator('.lobby-seats-grid')).toContainText('นักสืบโท');
      await expect(guest.page.locator('.lobby-seats-grid')).toContainText('นักสืบเอก');
      const roomCode = code;
      await provide({ host, guest, code: roomCode, room: async () => decodeRoomRecord(await database(`rooms/${roomCode}`), roomCode)! });
    } finally {
      await Promise.all([host.context.close(), guest.context.close()]);
      if (code) { await database(`rooms/${code}`, 'DELETE'); await database(`presence/${code}`, 'DELETE'); }
    }
  },
});
const selectors = { LOBBY: '.lobby-container', ROLE_INTRO: '.role-intro-container', ANSWERING: '.answering-container',
  ANSWER_REVEAL: '.reveal-container', DECIDING: '.deciding-container', ROUND_REVEAL: '.round-reveal-container',
  MATCH_RESULT: '.match-result-container', ABANDONED: '.error-box' } as const;
export async function phase(duo: Duo, value: keyof typeof selectors) {
  await expect.poll(async () => (await duo.room()).public.phase).toBe(value);
  await Promise.all([duo.host, duo.guest].map(player => expect(player.page.locator(selectors[value])).toBeVisible({ timeout: 20_000 })));
}
export async function click(player: Actor, selector: string) {
  await expect(player.page.locator(selector)).toBeEnabled(); await player.page.locator(selector).click();
}
export async function start(duo: Duo) {
  await Promise.all([duo.host, duo.guest].map(player => click(player, '.lobby-ready-btn')));
  await click(duo.host, '.lobby-start-btn'); await phase(duo, 'ROLE_INTRO');
}
export async function both(duo: Duo, selector: string) { await Promise.all([duo.host, duo.guest].map(player => click(player, selector))); }
export async function answers(duo: Duo) {
  await phase(duo, 'ANSWERING');
  await Promise.all([duo.host, duo.guest].map(async (player, index) => {
    await player.page.locator('.option-card').nth(index).click(); await click(player, '.submit-answer-btn');
  }));
  await phase(duo, 'ANSWER_REVEAL'); await both(duo, '.proceed-decide-btn'); await phase(duo, 'DECIDING');
}
export async function guess(player: Actor, role: RoleId) {
  const card = player.page.locator('.suspect-card').filter({ has: player.page.locator(`.role-${role}`) });
  await expect(card).toContainText(ROLES[role].name); await card.click();
  await click(player, '.lock-guess-btn'); await click(player, '.confirm-modal-actions .btn-primary');
}
export async function reload(player: Actor, selector: string) {
  await player.page.reload(); await expect(player.page.locator(selector)).toBeVisible({ timeout: 20_000 });
}
export async function leave(player: Actor) {
  await player.page.getByRole('button', { name: 'ออกจากห้อง', exact: true }).click();
  await click(player, '.confirm-modal-actions .btn-danger'); await expect(player.page).toHaveURL(/\/$/, { timeout: 20_000 });
}
export async function rawAction(duo: Duo, player: Actor, action: unknown) {
  const room = await duo.room();
  return player.context.request.post(`${target.baseURL}api/game/action`, { headers: { Authorization: `Bearer ${player.token()}` },
    data: { code: duo.code, actionId: randomUUID(), matchId: room.public.matchId, roundId: room.public.roundId, clueIndex: room.public.clueIndex, action } });
}
