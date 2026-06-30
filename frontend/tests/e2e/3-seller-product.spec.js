/**
 * Test 3 — Seller: Create a New Product
 *
 * login as seller → go to seller dashboard → create a new product →
 * confirm it appears in the product listing.
 */
import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  TEST_VENDOR_EMAIL,
  TEST_VENDOR_PASSWORD,
} from './helpers.js';

const PRODUCT_NAME = `E2E Test Product ${Date.now()}`;

test.describe('3 — Seller creates a new product', () => {
  test('login → seller dashboard → create product → verify in listing', async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[Browser Console Error] ${msg.text()}`);
      }
    });

    // ── Step 1: Log in as seller ─────────────────────────────────────────
    await loginViaUI(page, TEST_VENDOR_EMAIL, TEST_VENDOR_PASSWORD);

    // ── Step 2: Navigate to Seller Dashboard ─────────────────────────────
    await page.goto('/seller');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ── Step 3: Click on "Products" tab ──────────────────────────────────
    const productsTab = page.getByText(/Products/i).first();
    await productsTab.waitFor({ state: 'visible', timeout: 15_000 });
    await productsTab.click();
    await page.waitForTimeout(1500);

    // ── Step 4: Click "Add Product" / "New Product" button ───────────────
    const addProductBtn = page.locator(
      'button:has-text("Add"), button:has-text("New Product"), button:has-text("Create")',
    ).first();
    await addProductBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await addProductBtn.click();
    await page.waitForTimeout(1000);

    // ── Step 5: Fill in the product form ─────────────────────────────────
    // Product name
    await page.getByPlaceholder('Classic Luxury Gold Chronograph').fill(PRODUCT_NAME);

    // Price
    await page.getByPlaceholder('14900').fill('1500');

    // Original price
    await page.getByPlaceholder('19900').fill('2000');

    // Stock
    await page.getByPlaceholder('25').fill('50');

    // Image URL
    await page.getByPlaceholder('https://domain.com/photo.png').fill('https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=400');

    // Description (textarea)
    await page.getByPlaceholder('Provide customer copy detailing specification, materials, and sizes.').fill('This is an automated E2E test product created by Playwright.');

    // Category select (if visible, select the first option)
    const catSelect = page.locator('select').first();
    await catSelect.waitFor({ state: 'visible', timeout: 5000 });
    const options = await catSelect.locator('option').allTextContents();
    if (options.length > 1) {
      await catSelect.selectOption({ index: 1 });
    }

    // ── Step 6: Submit the form ──────────────────────────────────────────
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Add Product")',
    ).last();
    await submitBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await submitBtn.click();

    // Wait for success indication (toast or form close)
    await page.waitForTimeout(3000);

    // ── Step 7: Verify the product appears in the listing ────────────────
    // Navigate to shop page and search for the product
    await page.goto(`/shop?search=${encodeURIComponent(PRODUCT_NAME)}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // The product name should be visible on the page
    const productVisible = await page.getByText(PRODUCT_NAME).isVisible().catch(() => false);

    if (!productVisible) {
      // Fallback: check the seller dashboard products tab
      await page.goto('/seller');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const productsTab2 = page.getByText(/Products/i).first();
      await productsTab2.click();
      await page.waitForTimeout(2000);

      await expect(page.getByText(PRODUCT_NAME)).toBeVisible({ timeout: 10_000 });
    } else {
      expect(productVisible).toBeTruthy();
    }
  });
});
