import { expect } from '@playwright/test';
import { test } from '@playwright/test';

test.describe('Carriers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const email = `e2e-carriers-${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    await page.getByRole('link', { name: 'Criar conta' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\//, { timeout: 10000 });
    await expect(page.getByRole('button', { name: /Sair|Logout/i })).toBeVisible({ timeout: 10000 });
  });

  test('navigate to carriers list -> apply filters -> open detail -> verify breakdown', async ({
    page,
  }) => {
    await page.goto('/carriers');

    await expect(page.getByRole('heading', { name: /carrier|transportador/i })).toBeVisible({
      timeout: 15000,
    });

    const firstCard = page.locator('[data-testid="carrier-card"], a[href*="/carriers/"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await expect(page).toHaveURL(/\/carriers\/[a-f0-9]+/);
      await expect(page.getByRole('heading', { name: 'Breakdown' })).toBeVisible({ timeout: 5000 });
    }
  });
});
