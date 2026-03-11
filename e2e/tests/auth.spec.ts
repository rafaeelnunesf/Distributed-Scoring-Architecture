import { expect } from '@playwright/test';
import { test } from '@playwright/test';

test.describe('Auth', () => {
  test('register -> login -> verify session -> logout', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await page.goto('/login');

    await page.getByRole('link', { name: 'Criar conta' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page).toHaveURL(/\//);
    await expect(page.getByText(email, { exact: false })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Sair|Logout/i }).first().click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\//);
    await expect(page.getByText(email, { exact: false })).toBeVisible({ timeout: 5000 });
  });
});
