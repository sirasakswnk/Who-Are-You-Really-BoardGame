import { test, expect } from './fixtures';

test('saved profile and invite survive hydration and reload without browser errors', async ({ page }, info) => {
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /hydrat|React error #4\d\d/i.test(message.text())) browserErrors.push(message.text());
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem('wayr.profile')) localStorage.setItem('wayr.profile', JSON.stringify({ name: 'นักสืบเดิม', avatar: 'fox' }));
  });
  await page.goto('/?room=K7M2QP');
  await expect(page.locator('#name')).toHaveValue('นักสืบเดิม');
  await expect(page.locator('input[value="fox"]')).toBeChecked();
  await expect(page.locator('.stamp')).toHaveText('พร้อมสืบ');
  await expect(page.locator('#invite-code')).toHaveText('K7M2QP');
  await page.screenshot({ path: info.outputPath('home-invite.png'), fullPage: true });
  await page.reload();
  await expect(page.locator('#name')).toHaveValue('นักสืบเดิม');
  await expect(page.locator('#invite-code')).toHaveText('K7M2QP');
  await page.goto('/');
  await expect(page.locator('#name')).toHaveValue('นักสืบเดิม');
  await expect(page.locator('input[value="fox"]')).toBeChecked();
  await expect(page.locator('.stamp')).toHaveText('พร้อมสืบ');
  await expect(page.locator('#invite')).toHaveCount(0);
  await expect(page.locator('#code')).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wayr.profile')!))).toEqual({ name: 'นักสืบเดิม', avatar: 'fox' });
  await page.screenshot({ path: info.outputPath('home-saved-profile.png'), fullPage: true });
  expect(browserErrors).toEqual([]);
});
