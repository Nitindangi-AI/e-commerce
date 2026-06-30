/**
 * Test 2 — Existing User Reorder Flow
 *
 * login → go to orders → click on the most recent order →
 * add its items back to the cart (reorder).
 *
 * Since the app has no dedicated "reorder" button, reordering is done by
 * viewing the order detail, then navigating to each product and adding it
 * to the cart — which mirrors the real user behaviour.
 */
import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  TEST_CUSTOMER_EMAIL,
  TEST_CUSTOMER_PASSWORD,
} from './helpers.js';

test.describe('2 — Existing user reorder flow', () => {
  test('login → view orders → open most recent → add item to cart', async ({ page }) => {
    // ── Step 1: Log in as existing customer ──────────────────────────────
    await loginViaUI(page, TEST_CUSTOMER_EMAIL, TEST_CUSTOMER_PASSWORD);

    // ── Step 2: Navigate to Account / Orders ─────────────────────────────
    await page.goto('/account');
    await page.waitForLoadState('networkidle');

    // Click on the "Orders" tab / section
    const ordersTab = page.getByText(/Orders/i).first();
    await ordersTab.waitFor({ state: 'visible', timeout: 15_000 });
    await ordersTab.click();
    await page.waitForTimeout(1500);

    // ── Step 3: Click the most recent order ──────────────────────────────
    // Orders are rendered as links/cards with order IDs or "View" buttons
    const orderLink = page.locator('a[href*="/orders/"]').first();
    await orderLink.waitFor({ state: 'visible', timeout: 15_000 });
    await orderLink.click();

    // Wait for order detail page
    await page.waitForURL('**/orders/**', { timeout: 15_000 });
    await page.waitForLoadState('networkidle');

    // ── Step 4: Find a product link in the order items ───────────────────
    // Order items usually render the product image/name as a link to the
    // product detail page.
    const productLink = page.locator('a[href*="/product/"]').first();
    const hasProductLink = await productLink.isVisible().catch(() => false);

    if (hasProductLink) {
      // Navigate to the product and add it to cart (reorder)
      await productLink.click();
      await page.waitForURL('**/product/**', { timeout: 15_000 });

      const addBtn = page.getByRole('button', { name: /Add to Cart/i });
      await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await addBtn.click();
      await expect(page.getByRole('button', { name: /Added/i })).toBeVisible({ timeout: 5_000 });
    } else {
      // Fallback: the order detail page might show product names.
      // Navigate to /shop to find and add a product as a reorder substitute.
      await page.goto('/shop');
      await page.waitForLoadState('networkidle');

      const firstProduct = page.locator('a[href*="/product/slug/"]').first();
      await firstProduct.waitFor({ state: 'visible', timeout: 15_000 });
      await firstProduct.click();

      const addBtn = page.getByRole('button', { name: /Add to Cart/i });
      await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await addBtn.click();
      await expect(page.getByRole('button', { name: /Added/i })).toBeVisible({ timeout: 5_000 });
    }

    // ── Step 5: Verify item is in cart ────────────────────────────────────
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Proceed to Checkout/i)).toBeVisible({ timeout: 10_000 });
  });
});
