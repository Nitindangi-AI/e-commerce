/**
 * Test 1 — New User Signup Flow
 *
 * signup → receive OTP → enter OTP → browse products → add to cart →
 * checkout → see order confirmation page.
 */
import { test, expect } from '@playwright/test';
import {
  setOtpForEmail,
  cleanupUser,
  restoreEmailVerification,
} from './helpers.js';

const UNIQUE_SUFFIX = Date.now();
const TEST_EMAIL = `e2e-signup-${UNIQUE_SUFFIX}@example.com`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'E2E Test User';
const TEST_PHONE = '9876543210';

test.describe('1 — New user full purchase flow', () => {
  test.beforeAll(async () => {
    // Enable email verification so the OTP screen is shown
    await restoreEmailVerification(true);
  });

  test.afterAll(async () => {
    // Cleanup: delete the test user and restore email-verification setting
    try { await cleanupUser(TEST_EMAIL); } catch (_) { /* best-effort */ }
    try { await restoreEmailVerification(false); } catch (_) { /* best-effort */ }
  });

  test('signup → OTP → browse → add to cart → checkout → order confirmation', async ({ page }) => {
    // ── Step 1: Navigate to registration ─────────────────────────────────
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create Your Account' })).toBeVisible();

    // ── Step 2: Fill registration form ───────────────────────────────────
    await page.locator('input[placeholder="Enter your full name"]').fill(TEST_NAME);
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="tel"]').fill(TEST_PHONE);

    // Password fields — there are two (password + confirm)
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill(TEST_PASSWORD);
    await passwordInputs.nth(1).fill(TEST_PASSWORD);

    // Agree to terms
    await page.locator('#agree-checkbox').check();

    // Submit — triggers OTP email
    await page.getByRole('button', { name: /Send Verification Code/i }).click();

    // ── Step 3: Wait for OTP step ────────────────────────────────────────
    await expect(page.getByRole('heading', { name: 'Verify Email' })).toBeVisible({ timeout: 20_000 });

    // ── Step 4: Bypass OTP via database ──────────────────────────────────
    // Overwrite the OTP hash in the DB so "123456" is accepted
    const knownOtp = await setOtpForEmail(TEST_EMAIL);

    // Focus the first OTP input and type the code
    const otpInputs = page.locator('input[inputmode="numeric"], input[maxlength="1"]');
    const firstInput = otpInputs.first();
    await firstInput.waitFor({ state: 'visible', timeout: 10_000 });
    await firstInput.click();
    // Typing digit-by-digit triggers auto-advance in OTPInput component
    await page.keyboard.type(knownOtp, { delay: 100 });

    // ── Step 5: Wait for redirect to home page ───────────────────────────
    // Since RegisterPage is wrapped in GuestGuard, logging in/verifying
    // updates the authStore token and triggers GuestGuard to redirect us
    // directly to '/' (home page), unmounting RegisterPage.
    await page.waitForURL('/', { timeout: 20_000 });

    // ── Step 6: Browse products ──────────────────────────────────────────
    await page.goto('/shop');
    await page.waitForLoadState('networkidle');

    // Click the first product card (link to product detail)
    const firstProduct = page.locator('a[href*="/product/slug/"]').first();
    await firstProduct.waitFor({ state: 'visible', timeout: 15_000 });
    await firstProduct.click();

    // ── Step 7: Add to Cart ──────────────────────────────────────────────
    const addBtn = page.getByRole('button', { name: /Add to Cart/i });
    await addBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await addBtn.click();

    // Verify the button text changes to "✓ Added"
    await expect(page.getByRole('button', { name: /Added/i })).toBeVisible({ timeout: 5_000 });

    // ── Step 8: Go to Cart ───────────────────────────────────────────────
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Cart should have at least 1 item
    await expect(page.getByText(/Proceed to Checkout/i)).toBeVisible({ timeout: 10_000 });

    // Click "Proceed to Checkout"
    await page.getByText(/Proceed to Checkout/i).click();
    await page.waitForURL('**/checkout', { timeout: 10_000 });

    // ── Step 9: Checkout — Address step ──────────────────────────────────
    // For a new user with no saved addresses, the "Add New Address" radio
    // should already be selected. Fill in address fields.
    // Fill address fields (new user — no saved addresses)
    await page.locator('input[name="name"]').fill(TEST_NAME);
    await page.locator('input[name="phone"]').fill(TEST_PHONE);
    await page.locator('input[name="pincode"]').fill('400001');
    await page.locator('input[name="state"]').fill('Maharashtra');
    await page.locator('input[name="city"]').fill('Mumbai');
    await page.locator('input[name="area"]').fill('Test Area');
    await page.locator('input[name="line1"]').fill('123 Test Street');

    // Allow React state updates to propagate validation status
    await page.waitForTimeout(1000);

    // Click "Deliver Here" button for address
    const continueBtn = page.getByRole('button', { name: 'Deliver Here' }).first();
    await continueBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await continueBtn.click();

    // ── Step 10: Checkout — Payment step (select COD) ────────────────────
    // COD is the default payment method, so just proceed
    await page.waitForTimeout(1000);

    const nextPayBtn = page.getByRole('button', { name: 'Continue' }).first();
    await nextPayBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await nextPayBtn.click();

    // ── Step 11: Checkout — Confirm & Place Order ────────────────────────
    await page.waitForTimeout(1000);

    const placeOrderBtn = page.getByRole('button', { name: /Place Order/i }).first();
    await placeOrderBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await placeOrderBtn.click();

    // ── Step 12: Order confirmation page ─────────────────────────────────
    await page.waitForURL('**/order-success', { timeout: 30_000 });
    await expect(page.locator('body')).toContainText(/order/i);
  });
});
