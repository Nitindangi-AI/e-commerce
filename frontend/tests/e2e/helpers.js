
/**
 * Shared helpers for Trendy E2E Playwright tests.
 *
 * Provides:
 *  - loginViaUI()      – fill login form and wait for redirect
 *  - getDbClient()     – create a Postgres client (for OTP bypass, order seeding)
 *  - setOtpForEmail()  – overwrite OTP hash so "123456" is accepted
 *  - cleanupUser()     – delete a test user after a test run
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Database helper — reads DATABASE_URL from backend/.env
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDatabaseUrl() {
  const envPath = path.resolve(__dirname, '../../../backend/.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (!match) throw new Error('DATABASE_URL not found in backend/.env');
  return match[1].trim();
}

export async function getDbClient() {
  const pg = await import('pg');
  const client = new pg.default.Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

// ---------------------------------------------------------------------------
// OTP bypass — overwrites the otp_hash for a given email so "123456" works
// ---------------------------------------------------------------------------
export async function setOtpForEmail(email) {
  const bcrypt = await import('bcryptjs');
  const db = await getDbClient();
  try {
    const testOtp = '123456';
    const hash = bcrypt.default.hashSync(testOtp, 10);
    // Ensure email verification is enabled
    await db.query('UPDATE auth.config SET require_email_verification = true;');
    // Update the latest OTP row for this email
    await db.query(
      'UPDATE auth.email_otps SET otp_hash = $1 WHERE email = $2;',
      [hash, email],
    );
    return testOtp;
  } finally {
    await db.end();
  }
}

// ---------------------------------------------------------------------------
// Restore email verification setting (safety net)
// ---------------------------------------------------------------------------
export async function restoreEmailVerification(enabled = false) {
  const db = await getDbClient();
  try {
    await db.query(
      `UPDATE auth.config SET require_email_verification = ${enabled};`,
    );
  } finally {
    await db.end();
  }
}

// ---------------------------------------------------------------------------
// Login helper — fills the login form and waits for navigation
// ---------------------------------------------------------------------------
export async function loginViaUI(page, email, password) {
  let attempt = 0;
  while (attempt < 3) {
    try {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').first().fill(password);
      await page.locator('button[type="submit"]').click();

      // Wait until we leave the /login page (redirect after login)
      await page.waitForURL((url) => !url.pathname.includes('/login'), {
        timeout: 15_000,
      });
      // Small grace period for auth store hydration
      await page.waitForTimeout(1500);
      return;
    } catch (e) {
      attempt++;
      console.log(`Login attempt ${attempt} failed: ${e.message}. Retrying...`);
      if (attempt >= 3) throw e;
      await page.waitForTimeout(2000);
    }
  }
}

// ---------------------------------------------------------------------------
// Delete a test user (cleanup after signup test)
// ---------------------------------------------------------------------------
export async function cleanupUser(email) {
  const db = await getDbClient();
  try {
    // Remove OTP rows
    await db.query('DELETE FROM auth.email_otps WHERE email = $1;', [email]);
    // Remove the user from auth.users (cascades to profiles, sessions, etc.)
    await db.query('DELETE FROM auth.users WHERE email = $1;', [email]);
  } finally {
    await db.end();
  }
}

// ---------------------------------------------------------------------------
// Test credentials from .env (with safe fallbacks)
// ---------------------------------------------------------------------------
export const TEST_CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || 'user1@trendy.com';
export const TEST_CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD || 'user123';
export const TEST_VENDOR_EMAIL = process.env.TEST_VENDOR_EMAIL || 'seller1@trendy.com';
export const TEST_VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || 'seller123';
export const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@trendy.com';
export const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'admin123';

// Standard coupon code available in seeded data
export const TEST_COUPON_CODE = 'FIRST500';
