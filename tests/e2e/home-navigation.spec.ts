import { test, expect, leave, database, type Actor } from './fixtures';
import type { Page, Route } from '@playwright/test';

async function expectHomeIdle(player: Actor, name: string, avatar: string) {
  const page = player.page;
  await expect(page.locator('#btn-create:visible')).toHaveText('สร้างห้องใหม่');
  await expect(page.locator('#btn-create:visible')).toBeEnabled();
  await expect(page.locator('#btn-join:visible')).toHaveText('เข้าห้อง');
  await expect(page.locator('#btn-join:visible')).toBeEnabled();
  await expect(page.locator('#status:visible')).toBeEmpty();
  await expect(page.locator('#name:visible')).toHaveValue(name);
  await expect(page.locator(`input[value="${avatar}"]:visible`)).toBeChecked();
  await expect(page.locator('#code:visible')).toHaveValue('');
}

async function holdRequest(page: Page, path: string) {
  let release!: () => void;
  let reached!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const received = new Promise<void>(resolve => { reached = resolve; });
  const handler = async (route: Route) => {
    reached();
    await gate;
    await route.continue();
  };
  await page.route(path, handler);
  return { received, release, remove: () => page.unroute(path, handler) };
}

test('home returns to idle after invite and manual joins, then can join again', async ({ duo }, info) => {
  const page = duo.guest.page;
  await leave(duo.guest);
  await expectHomeIdle(duo.guest, 'นักสืบโท', 'fox');

  await page.locator('#code:visible').fill(duo.code);
  const request = await holdRequest(page, '**/api/room/join');
  try {
    await page.locator('#btn-join:visible').click();
    await request.received;
    await expect(page.locator('#btn-join:visible')).toHaveText('กำลังเข้าห้อง…');
    await expect(page.locator('#btn-create:visible')).toHaveText('สร้างห้องใหม่');
    await expect(page.locator('#btn-join:visible')).toBeDisabled();
    await expect(page.locator('#btn-create:visible')).toBeDisabled();
  } finally { request.release(); }
  await expect(page).toHaveURL(new RegExp(`/room/${duo.code}$`));
  await expect(page.locator('.lobby-container:visible')).toBeVisible();
  await request.remove();
  await leave(duo.guest);
  await expectHomeIdle(duo.guest, 'นักสืบโท', 'fox');
  await page.screenshot({ path: info.outputPath('home-after-join-and-leave.png'), fullPage: true });
});

test('home returns to idle after creating and leaving a room, then can create again', async ({ duo }, info) => {
  const page = duo.host.page;
  await leave(duo.host);
  await expectHomeIdle(duo.host, 'นักสืบเอก', 'cat');
  const request = await holdRequest(page, '**/api/room/create');
  let createdCode: string | undefined;
  try {
    try {
      await page.locator('#btn-create:visible').click();
      await request.received;
      await expect(page.locator('#btn-create:visible')).toHaveText('กำลังสร้างห้อง…');
      await expect(page.locator('#btn-join:visible')).toHaveText('เข้าห้อง');
      await expect(page.locator('#btn-create:visible')).toBeDisabled();
      await expect(page.locator('#btn-join:visible')).toBeDisabled();
    } finally { request.release(); }
    await expect(page).toHaveURL(/\/room\/[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    createdCode = new URL(page.url()).pathname.split('/').pop();
    await expect(page.locator('.lobby-container:visible')).toBeVisible();
    await request.remove();
    await leave(duo.host);
    await expectHomeIdle(duo.host, 'นักสืบเอก', 'cat');
    await page.screenshot({ path: info.outputPath('home-after-create-and-leave.png'), fullPage: true });
  } finally {
    if (createdCode) {
      await database(`rooms/${createdCode}`, 'DELETE');
      await database(`presence/${createdCode}`, 'DELETE');
    }
  }
});
