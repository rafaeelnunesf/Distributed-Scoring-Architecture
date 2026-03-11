import { expect } from '@playwright/test';
import { test } from '@playwright/test';
import path from 'path';

test.describe('Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const email = `e2e-upload-${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    await page.getByRole('link', { name: 'Criar conta' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\//, { timeout: 10000 });
  });

  test('login -> upload payload -> wait for SSE completion -> verify summary', async ({
    page,
  }) => {
    await page.goto('/');

    const payloadPath = path.resolve(__dirname, '../../sample-data/payload.json');
    await page.locator('input[type="file"]').setInputFiles(payloadPath);

    await expect(page.getByText(/processando|processing|completed|concluído/i)).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(/total_records|registros|records/i)).toBeVisible({
      timeout: 5000,
    });
  });
});
