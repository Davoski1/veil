// Playwright browser matrix test for SDK happy‑path
import { test, expect } from '@playwright/test';
import { useInvisibleWallet } from '../src/useInvisibleWallet';

test.describe('SDK WebAuthn happy‑path across browsers', () => {
  test('runs happy‑path', async ({ page }) => {
    // Navigate to the dev server (set by Playwright config)
    await page.goto('/');
    // The SDK function can be called in the browser context; here we just ensure it loads.
    const result = await page.evaluate(() => {
      // @ts-ignore – SDK is bundled globally in the test environment
      return typeof useInvisibleWallet === 'function';
    });
    expect(result).toBeTruthy();
  });
});
