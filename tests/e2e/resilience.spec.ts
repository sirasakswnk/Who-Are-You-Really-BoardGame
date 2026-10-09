import { test, expect } from '@playwright/test';

test.describe('Resilience & Edge Cases E2E (tests/e2e/resilience.spec.ts)', () => {
  test('recovers player session on page reload without losing room or seat', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Create room
    await page.goto('/');
    await page.fill('#name', 'นักสืบรีโหลด');
    await page.locator('input[value="cat"]').check();
    await page.click('#btn-create');

    await expect(page).toHaveURL(/\/room\/[A-Z2-9]{6}/, { timeout: 15000 });
    const roomUrl = page.url();

    // Verify in lobby
    await expect(page.locator('.lobby-seats-grid')).toContainText('นักสืบรีโหลด');

    // 2. Reload the page
    await page.reload();

    // Verify session resumes seamlessly
    await expect(page).toHaveURL(roomUrl);
    await expect(page.locator('.lobby-seats-grid')).toContainText('นักสืบรีโหลด', { timeout: 15000 });

    await context.close();
  });

  test('rejects a 3rd player when room is already full', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    // 1. Host creates room
    await page1.goto('/');
    await page1.fill('#name', 'ผู้เล่นที่ 1');
    await page1.locator('input[value="cat"]').check();
    await page1.click('#btn-create');
    await expect(page1).toHaveURL(/\/room\/[A-Z2-9]{6}/, { timeout: 15000 });
    const roomCode = page1.url().split('/').pop()!;

    // 2. Guest 1 joins
    await page2.goto(`/?room=${roomCode}`);
    await page2.fill('#name', 'ผู้เล่นที่ 2');
    await page2.locator('input[value="fox"]').check();
    await page2.click('#btn-join');
    await expect(page2).toHaveURL(new RegExp(`/room/${roomCode}`), { timeout: 15000 });

    // 3. Guest 2 (3rd player) tries to join
    await page3.goto(`/?room=${roomCode}`);
    await page3.fill('#name', 'ผู้เล่นคนที่ 3');
    await page3.locator('input[value="bear"]').check();
    await page3.click('#btn-join');

    // Guest 2 should see error message on home page
    const statusMsg = page3.locator('#status');
    await expect(statusMsg).toBeVisible({ timeout: 10000 });
    await expect(statusMsg).toContainText('เต็ม');

    await context1.close();
    await context2.close();
    await context3.close();
  });

  test('confirms leave room dialog and navigates back to home', async ({ page }) => {
    await page.goto('/');
    await page.fill('#name', 'นักสืบลาออก');
    await page.locator('input[value="cat"]').check();
    await page.click('#btn-create');

    await expect(page).toHaveURL(/\/room\/[A-Z2-9]{6}/, { timeout: 15000 });
    await expect(page.locator('.lobby-code-chars')).toBeVisible({ timeout: 15000 });

    // Click leave room button (door icon in header)
    const leaveBtn = page.locator('.header-btn-leave');
    await leaveBtn.click();

    // Confirmation dialog appears
    await expect(page.locator('.confirm-modal-box')).toBeVisible();
    await expect(page.locator('.confirm-modal-box')).toContainText('ออกจากห้อง?');

    // Click confirm leave
    await page.locator('.confirm-modal-actions .btn-danger').click();

    // Redirected back to home page
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.locator('#name')).toBeVisible();
  });
});
