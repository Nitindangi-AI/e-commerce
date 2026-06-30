/**
 * Test 5 — Return Request Flow
 *
 * go to a delivered order → request a return → confirm return status is shown.
 *
 * Since we need a "Delivered" order to test returns, this test:
 *   1. Creates a fresh order via the checkout flow
 *   2. Uses the database to fast-forward the order status to "Delivered"
 *   3. Navigates to the order detail page and requests a return
 */
import { test, expect } from '@playwright/test';
import {
  loginViaUI,
  getDbClient,
  TEST_CUSTOMER_EMAIL,
  TEST_CUSTOMER_PASSWORD,
} from './helpers.js';

test.describe('5 — Return request flow', () => {
  test('navigate to delivered order → request return → confirm status', async ({ page }) => {
    // ── Step 1: Log in ───────────────────────────────────────────────────
    await loginViaUI(page, TEST_CUSTOMER_EMAIL, TEST_CUSTOMER_PASSWORD);

    // ── Step 2: Find a delivered order or mark an existing one ────────────
    // First, check if any delivered orders already exist
    await page.goto('/account');
    await page.waitForLoadState('networkidle');

    // Click Orders tab
    const ordersTab = page.getByText(/Orders/i).first();
    await ordersTab.waitFor({ state: 'visible', timeout: 15_000 });
    await ordersTab.click();
    await page.waitForTimeout(2000);

    // Try to find a "Delivered" order badge / link
    let deliveredOrderUrl = null;

    // Check for an order with "Delivered" status
    const deliveredBadge = page.locator('text=Delivered').first();
    const hasDelivered = await deliveredBadge.isVisible().catch(() => false);

    if (hasDelivered) {
      // Click the delivered order's "View" link or the order card
      const orderCard = deliveredBadge.locator('xpath=ancestor::a[contains(@href,"/orders/")]');
      const cardVisible = await orderCard.isVisible().catch(() => false);

      if (cardVisible) {
        deliveredOrderUrl = await orderCard.getAttribute('href');
      } else {
        // Try to find the nearest order link
        const orderLinks = page.locator('a[href*="/orders/"]');
        const count = await orderLinks.count();
        for (let i = 0; i < count; i++) {
          const link = orderLinks.nth(i);
          const text = await link.textContent();
          if (text?.includes('Delivered')) {
            deliveredOrderUrl = await link.getAttribute('href');
            break;
          }
        }
      }
    }

    if (!deliveredOrderUrl) {
      // No delivered orders found — try to mark the most recent order as Delivered via DB
      const db = await getDbClient();
      try {
        // Get the most recent order for this customer
        const userRes = await db.query(
          `SELECT id FROM auth.users WHERE email = $1 LIMIT 1;`,
          [TEST_CUSTOMER_EMAIL],
        );

        if (userRes.rows.length > 0) {
          const userId = userRes.rows[0].id;
          const orderRes = await db.query(
            `SELECT id FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1;`,
            [userId],
          );

          if (orderRes.rows.length > 0) {
            const orderId = orderRes.rows[0].id;
            // Fast-forward to Delivered and set created_at recently so return window is open
            await db.query(
              `UPDATE orders SET 
                 order_status = 'Delivered', 
                 return_status = 'none', 
                 delivered_at = NOW(),
                 created_at = NOW() - interval '1 hour'
               WHERE id = $1;`,
              [orderId],
            );
            
            // Also ensure product items in this order are returnable
            await db.query(
              `UPDATE products SET return_policy = '{"returnable": true, "returnDays": 7}'::jsonb
               WHERE id IN (SELECT product_id FROM order_items WHERE order_id = $1);`,
              [orderId],
            );
            
            deliveredOrderUrl = `/orders/${orderId}`;
          }
        }
      } finally {
        await db.end();
      }
    }

    // If we still have no order, the test cannot proceed
    if (!deliveredOrderUrl) {
      console.warn('No orders found for test customer — skipping return test');
      test.skip();
      return;
    }

    // ── Step 3: Navigate to the delivered order ──────────────────────────
    await page.goto(deliveredOrderUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify the order page loaded with "Delivered" status
    await expect(page.getByText(/Delivered/i).first()).toBeVisible({ timeout: 10_000 });

    // ── Step 4: Click "Request Return" ───────────────────────────────────
    const returnBtn = page.locator('button:has-text("Return"), button:has-text("Request Return")').first();
    await returnBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await returnBtn.click();

    // ── Step 5: Fill the return modal ────────────────────────────────────
    // Wait for the modal to appear
    await page.waitForTimeout(1000);

    // Select a return reason from the dropdown
    const reasonSelect = page.locator('select').first();
    await reasonSelect.waitFor({ state: 'visible', timeout: 5_000 });
    await reasonSelect.selectOption({ value: 'received defected product' });

    // Click "Submit Return"
    const submitReturnBtn = page.locator(
      'button:has-text("Submit Return"), button:has-text("Submit")',
    ).last();
    await submitReturnBtn.click();

    // ── Step 6: Verify return status is shown ────────────────────────────
    await page.waitForTimeout(3000);

    // After submitting, the order status should change to "Return Requested"
    // or a success toast / confirmation should appear
    const returnRequested = await page.getByText(/Return Requested/i).isVisible().catch(() => false);
    const returnSuccess = await page.getByText(/return.*submitted|return.*success/i).isVisible().catch(() => false);

    expect(returnRequested || returnSuccess).toBeTruthy();
  });
});
