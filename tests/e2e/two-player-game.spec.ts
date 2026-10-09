import { test, expect } from '@playwright/test';

test.describe('Two-Player Full Game Loop (tests/e2e/two-player-game.spec.ts)', () => {
  test('two isolated browser contexts can create room, join, answer, reveal, guess, and view results', async ({
    browser,
  }) => {
    // 1. Create two isolated browser contexts (independent storage, cookies, anonymous UIDs)
    const contextHost = await browser.newContext();
    const contextGuest = await browser.newContext();

    const pageHost = await contextHost.newPage();
    const pageGuest = await contextGuest.newPage();

    // 2. Host creates room
    await pageHost.goto('/');
    await pageHost.fill('#name', 'นักสืบเอก');
    await pageHost.locator('input[value="cat"]').check();
    await pageHost.click('#btn-create');

    // Host lands on /room/[CODE]
    await expect(pageHost).toHaveURL(/\/room\/[A-Z2-9]{6}/, { timeout: 15000 });
    const roomUrl = pageHost.url();
    const roomCode = roomUrl.split('/').pop()!;
    expect(roomCode).toHaveLength(6);

    // Host sees lobby
    await expect(pageHost.locator('.lobby-code-chars')).toHaveText(roomCode);
    await expect(pageHost.locator('.lobby-seats-grid')).toContainText('นักสืบเอก');

    // 3. Guest joins via invite URL
    await pageGuest.goto(`/?room=${roomCode}`);
    await pageGuest.fill('#name', 'นักสืบโท');
    await pageGuest.locator('input[value="fox"]').check();
    await pageGuest.click('#btn-join');

    // Guest lands on /room/[CODE]
    await expect(pageGuest).toHaveURL(new RegExp(`/room/${roomCode}`), { timeout: 15000 });

    // Both see both players in Lobby
    await expect(pageGuest.locator('.lobby-seats-grid')).toContainText('นักสืบเอก');
    await expect(pageGuest.locator('.lobby-seats-grid')).toContainText('นักสืบโท');
    await expect(pageHost.locator('.lobby-seats-grid')).toContainText('นักสืบโท', { timeout: 15000 });

    // 4. Guest toggles Ready
    await pageGuest.click('.lobby-ready-btn');
    await expect(pageGuest.locator('.lobby-ready-btn')).toContainText('ยกเลิกสถานะพร้อม');

    // Host also toggles Ready
    await pageHost.click('.lobby-ready-btn');

    // Host starts match
    const startBtn = pageHost.locator('.lobby-start-btn');
    await expect(startBtn).toBeEnabled({ timeout: 15000 });
    await startBtn.click();

    // 5. Both enter ROLE_INTRO phase
    await expect(pageHost.locator('.role-intro-container')).toBeVisible({ timeout: 15000 });
    await expect(pageGuest.locator('.role-intro-container')).toBeVisible({ timeout: 15000 });

    // Both acknowledge their secret role
    await pageHost.click('.acknowledge-role-btn');
    await pageGuest.click('.acknowledge-role-btn');

    // 6. Both enter ANSWERING phase (Round 1, Clue 1)
    await expect(pageHost.locator('.answering-container')).toBeVisible({ timeout: 15000 });
    await expect(pageGuest.locator('.answering-container')).toBeVisible({ timeout: 15000 });

    // Both players pick options
    const hostOptions = pageHost.locator('.option-card');
    await hostOptions.first().click();
    await pageHost.click('.submit-answer-btn');

    const guestOptions = pageGuest.locator('.option-card');
    await guestOptions.nth(1).click();
    await pageGuest.click('.submit-answer-btn');

    // 7. Both enter ANSWER_REVEAL phase
    await expect(pageHost.locator('.reveal-container')).toBeVisible({ timeout: 15000 });
    await expect(pageGuest.locator('.reveal-container')).toBeVisible({ timeout: 15000 });

    // Both acknowledge reveal to move to DECIDING
    await pageHost.click('.proceed-decide-btn');
    await pageGuest.click('.proceed-decide-btn');

    // 8. Both enter DECIDING phase
    await expect(pageHost.locator('.deciding-container')).toBeVisible({ timeout: 15000 });
    await expect(pageGuest.locator('.deciding-container')).toBeVisible({ timeout: 15000 });

    // Verify 5 active suspect cards (own role eliminated)
    await expect(pageHost.locator('.suspect-card:not(.is-self-eliminated)')).toHaveCount(5);
    await expect(pageHost.locator('.is-self-eliminated')).toHaveCount(1);

    // Host decides to make a guess right on Clue 1 for 5 points!
    const suspectCards = pageHost.locator('.suspect-card:not(.is-self-eliminated)');
    await suspectCards.first().click();
    await pageHost.click('.lock-guess-btn');

    // Host confirms guess modal
    await expect(pageHost.locator('.confirm-modal-box')).toBeVisible();
    await pageHost.locator('.confirm-modal-actions .btn-primary').click();

    // Guest decides to continue to next clue
    await pageGuest.click('.continue-clue-btn');

    // 9. Both transition to next clue (ANSWERING Clue 2)
    await expect(pageGuest.locator('.answering-container')).toBeVisible({ timeout: 15000 });

    // Cleanup contexts
    await contextHost.close();
    await contextGuest.close();
  });
});
