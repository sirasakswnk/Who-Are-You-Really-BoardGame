import { test, expect, type Page } from '@playwright/test';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { getRoleInfo, getRoleIds, LEGACY_CONTENT_VERSION } from '../../lib/game/types';
import { getRolePresentation } from '../../components/game/rolePresentation';

let harnessJS = '', harnessCSS = '';
const errors = new WeakMap<Page, string[]>();
test.beforeAll(async () => {
  const bundle = await build({
    entryPoints: ['tests/e2e/ui/DecidingHarness.tsx'], bundle: true, write: false,
    outdir: 'test-results/deciding-harness', platform: 'browser', format: 'iife',
    define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' },
  });
  harnessJS = bundle.outputFiles.find(file => file.path.endsWith('.js'))!.text;
  harnessCSS = bundle.outputFiles.find(file => file.path.endsWith('.css'))!.text;
  await mkdir('work/verification/content-update/deciding-mobile', { recursive: true });
});
test.beforeEach(({ page }) => {
  const collected: string[] = []; errors.set(page, collected);
  page.on('pageerror', error => collected.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

async function openPreview(page: Page, params = '') {
  await page.goto(`/preview?phase=DECIDING${params}`);
  await page.getByRole('heading', { name: 'เพื่อนของคุณน่าจะเป็นใคร?' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'nextjs-portal { display:none!important }' });
}
async function checkWidth(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}
async function screenshot(page: Page, label: string) {
  const viewport = page.viewportSize()!;
  await page.screenshot({ path: `work/verification/content-update/deciding-mobile/${viewport.width}x${viewport.height}-${label}.png`, animations: 'disabled' });
}
async function mountHarness(page: Page) {
  await page.route('**/__deciding-ui-harness__', route => route.fulfill({
    contentType: 'text/html', body: '<div id="deciding-harness"></div>',
  }));
  await page.goto('/__deciding-ui-harness__');
  await page.addStyleTag({ content: harnessCSS });
  await page.addScriptTag({ content: harnessJS });
  await page.getByRole('radio', { name: 'สายลับ', exact: true }).waitFor();
}

test('compact suspects, native selection, independent details and notes, focus, confirmation', async ({ page }) => {
  await openPreview(page);
  const cards = page.locator('.suspect-card');
  await expect(cards).toHaveCount(5);
  await expect(page.getByRole('radio')).toHaveCount(5);
  await expect(page.getByRole('radio', { name: 'เอเลี่ยนปลอมตัว', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ดูบทของฉัน', exact: true })).toBeVisible();
  expect(await cards.locator('input[type="radio"] button, label button, [role="radio"] button').count()).toBe(0);
  expect(await cards.locator('button').count()).toBe(5);
  const viewWidth = page.viewportSize()!.width;
  const dimensions = await cards.evaluateAll(items => items.map(el => ({ height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width, x: el.getBoundingClientRect().x })));
  if (viewWidth < 560) {
    expect(new Set(dimensions.map(item => item.x)).size).toBe(1);
    for (const card of dimensions) { expect(card.height).toBeGreaterThanOrEqual(110); expect(card.height).toBeLessThanOrEqual(170); }
  }
  for (const role of getRoleIds().filter(role => role !== 'alien')) {
    await expect(cards.getByText(getRolePresentation(role).shortDescription, { exact: true })).toHaveCount(1);
  }
  const questionToggle = page.getByRole('button', { name: 'ดูคำถาม', exact: false });
  await expect(questionToggle).toHaveAttribute('aria-expanded', 'false');
  const prompt = page.locator(`[id="${await questionToggle.getAttribute('aria-controls')}"]`);
  await expect(prompt).toBeHidden();
  await expect(page.locator('.deciding-evidence-review p').first()).toBeVisible();
  await questionToggle.click(); await expect(prompt).toBeVisible();
  await page.getByRole('button', { name: 'ซ่อนคำถาม', exact: false }).click();

  const spy = page.getByRole('radio', { name: 'สายลับ', exact: true });
  await spy.check(); await expect(spy).toBeChecked();
  await page.getByRole('radio', { name: 'แวมไพร์', exact: true }).check();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
  await spy.check();
  await expect(page.getByRole('button', { name: 'ล็อกคำทาย', exact: true })).toBeEnabled();
  await expect(page.getByText('ทายถูกตอนนี้ได้ 5 แต้ม', { exact: true })).toBeVisible();
  await spy.focus(); await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'แวมไพร์', exact: true })).toBeChecked();
  await spy.check();
  await page.locator('.suspects-grid').scrollIntoViewIfNeeded();
  await screenshot(page, 'selected');

  const trigger = page.getByRole('button', { name: 'ดูบทบาทเต็ม: นักเดินทางข้ามเวลา', exact: true });
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox!.width).toBeGreaterThanOrEqual(44); expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
  await trigger.focus(); await page.keyboard.press('Enter');
  const details = page.getByRole('dialog', { name: 'นักเดินทางข้ามเวลา', exact: true });
  await expect(details).toBeVisible();
  await expect(details.getByText(getRoleInfo('time_traveler').description, { exact: true })).toBeVisible();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  const image = details.locator('img');
  await expect(image).toHaveAttribute('data-role-portrait', 'time_traveler');
  await image.evaluate(el => el instanceof HTMLImageElement && (el.complete || new Promise(resolve => el.onload = resolve)));
  await screenshot(page, 'details');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await details.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await details.getByRole('button', { name: '? สงสัย', exact: true }).click();
  await expect(details.getByRole('button', { name: '? สงสัย', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await details.getByRole('button', { name: '✕ ตัดออก', exact: true }).click();
  await expect(details.getByRole('button', { name: '? สงสัย', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape'); await expect(details).toBeHidden();
  await expect(trigger).toBeFocused(); await expect(spy).toBeChecked();
  const markedCard = cards.filter({ has: trigger });
  await expect(markedCard.getByText('ตัดออก', { exact: true })).toBeVisible();
  const time = page.getByRole('radio', { name: 'นักเดินทางข้ามเวลา', exact: true });
  await expect(time).toBeEnabled(); await time.check(); await expect(time).toBeChecked();
  await trigger.click();
  await details.getByRole('button', { name: '✕ ตัดออก', exact: true }).click();
  await details.getByRole('button', { name: 'ปิดรายละเอียด' }).click();
  await expect(markedCard.getByText('ตัดออก', { exact: true })).toHaveCount(0);

  const lastDetails = cards.last().getByRole('button');
  await page.keyboard.press('Tab');
  await lastDetails.focus();
  if (viewWidth < 560) {
    const lastBox = await cards.last().boundingBox(), footer = await page.locator('.deciding-footer').boundingBox();
    expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(footer!.y - 2);
    expect(footer!.y + footer!.height).toBeCloseTo(page.viewportSize()!.height, 0);
  }
  const lock = page.getByRole('button', { name: 'ล็อกคำทาย', exact: true });
  const lockBox = await lock.boundingBox(); expect(lockBox!.height).toBeGreaterThanOrEqual(44);
  await lock.click();
  const confirmation = page.getByRole('dialog', { name: 'ยืนยันการล็อกคำทาย?', exact: true });
  await expect(confirmation).toContainText('นักเดินทางข้ามเวลา');
  await expect(confirmation).toContainText('ทายได้เพียงครั้งเดียว');
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await screenshot(page, 'confirmation');
  await confirmation.getByRole('button', { name: 'เปลี่ยนใจเลือกใหม่' }).click();
  await expect(lock).toBeFocused(); await expect(time).toBeChecked();
  await lock.click(); await confirmation.getByRole('button', { name: 'ยืนยันล็อกคำทาย!' }).click();
  await expect(page.getByText('รออีกฝ่ายพร้อมไปต่อ', { exact: true })).toBeVisible();
  await expect(page.locator('.lock-guess-btn')).toHaveCount(0);
  await checkWidth(page);
});

test('final clue, guessed/submitted/offline states and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPreview(page, '&clue=4');
  await expect(page.getByRole('button', { name: 'ดูข้อถัดไป', exact: true })).toHaveCount(0);
  await expect(page.getByText('ทายถูกตอนนี้ได้ 2 แต้ม', { exact: true })).toBeVisible();
  const ghost = page.getByRole('radio', { name: 'ผีที่ไม่มีใครรู้', exact: true });
  await ghost.check();
  await page.getByRole('button', { name: 'ดูบทบาทเต็ม: ผีที่ไม่มีใครรู้' }).click();
  const detail = page.getByRole('dialog', { name: 'ผีที่ไม่มีใครรู้', exact: true });
  expect(await detail.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await detail.getByRole('button', { name: 'ปิดรายละเอียด' }).click();
  await openPreview(page, '&state=guessed');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('button', { name: 'พร้อมไปต่อ', exact: true }).click();
  await expect(page.getByText('รออีกฝ่ายพร้อมไปต่อ', { exact: true })).toBeVisible();
  await openPreview(page, '&state=waiting');
  await expect(page.getByText('รออีกฝ่ายพร้อมไปต่อ', { exact: true })).toBeVisible();
  for (const radio of await page.getByRole('radio').all()) await expect(radio).toBeDisabled();
  await openPreview(page, '&state=blocked');
  await expect(page.getByRole('button', { name: 'ดูข้อถัดไป' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'ล็อกคำทาย', exact: true })).toBeDisabled();
  for (const radio of await page.getByRole('radio').all()) await expect(radio).toBeDisabled();
  await page.getByRole('button', { name: 'ดูบทบาทเต็ม: สายลับ' }).click();
  await expect(page.getByRole('dialog', { name: 'สายลับ', exact: true })).toBeVisible();
  await checkWidth(page);
});

test('delayed submit is single, failure retains choice, rerenders retain state, round identity resets', async ({ page }) => {
  await mountHarness(page);
  const spy = page.getByRole('radio', { name: 'สายลับ', exact: true });
  await spy.check();
  await page.evaluate(() => window.decidingHarness.set({ actionBlocked: false }));
  await expect(spy).toBeChecked();
  const detailsTrigger = page.getByRole('button', { name: 'ดูบทบาทเต็ม: แวมไพร์' });
  await detailsTrigger.click();
  await page.getByRole('dialog', { name: 'แวมไพร์', exact: true }).getByRole('button', { name: '? สงสัย', exact: true }).click();
  await page.keyboard.press('Escape'); await expect(spy).toBeChecked();
  const lock = page.getByRole('button', { name: 'ล็อกคำทาย', exact: true });
  await lock.click();
  const send = page.getByRole('button', { name: 'ยืนยันล็อกคำทาย!', exact: true });
  await send.evaluate(element => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
  expect(await page.evaluate(() => window.decidingHarness.calls)).toEqual([{ type: 'guess', roleId: 'spy' }]);
  await expect(spy).toBeDisabled(); await expect(lock).toBeDisabled();
  await page.evaluate(() => window.decidingHarness.reject!());
  await expect(page.getByRole('alert')).toContainText('ส่งการตัดสินใจไม่สำเร็จ');
  await expect(spy).toBeChecked(); await expect(spy).toBeEnabled();
  await lock.click(); await page.getByRole('button', { name: 'ยืนยันล็อกคำทาย!' }).click();
  expect(await page.evaluate(() => window.decidingHarness.calls.length)).toBe(2);
  await page.evaluate(() => window.decidingHarness.resolve!());
  await expect(lock).toBeEnabled();
  await detailsTrigger.click();
  await page.evaluate(() => window.decidingHarness.set({ actionBlocked: true }));
  await expect(page.getByRole('dialog', { name: 'แวมไพร์', exact: true })).toBeVisible();
  await page.evaluate(() => window.decidingHarness.set({ roleContextKey: 'match-one:round-two', actionBlocked: false }));
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await spy.check(); await lock.click();
  await page.evaluate(() => window.decidingHarness.set({ roleContextKey: 'match-two:round-one' }));
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
});

test('missing own role loads safely and legacy catalog retains five compatible candidates', async ({ page }) => {
  await mountHarness(page);
  await page.evaluate(() => window.decidingHarness.set({ myRole: null }));
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByText('กำลังโหลดบทบาทของคุณ ก่อนเปิดรายชื่อผู้ต้องสงสัย...')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ล็อกคำทาย', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'ดูข้อถัดไป' })).toBeDisabled();
  await expect(page.getByText('ผู้ต้องสงสัย 5 บทบาท · ตัดบทของคุณออกแล้ว')).toHaveCount(0);
  await page.evaluate(() => window.decidingHarness.set({ myRole: 'saver' }));
  await expect(page.getByRole('radio')).toHaveCount(5);
  await expect(page.locator('.suspects-grid img[data-role-portrait]')).toHaveCount(0);
  for (const role of getRoleIds(LEGACY_CONTENT_VERSION).filter(role => role !== 'saver')) {
    await expect(page.getByRole('radio', { name: getRoleInfo(role).name, exact: true })).toBeEnabled();
    await expect(page.locator('.suspects-grid').getByText(getRoleInfo(role).description, { exact: true })).toHaveCount(1);
  }
  await page.getByRole('radio', { name: 'คนรักสบาย', exact: true }).check();
  await page.getByRole('button', { name: 'ล็อกคำทาย', exact: true }).click();
  await page.getByRole('button', { name: 'ยืนยันล็อกคำทาย!' }).click();
  expect(await page.evaluate(() => window.decidingHarness.calls)).toEqual([{ type: 'guess', roleId: 'comfort' }]);
  await page.evaluate(() => window.decidingHarness.resolve!());
  await checkWidth(page);
});
