import { test, expect } from '@playwright/test';

test('capture admin dashboard error', async ({ page }) => {
  const errors = [];
  const logs = [];

  page.on('pageerror', err => {
    errors.push(err.message + '\n' + err.stack);
  });

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    console.log("Navigating to login...");
    await page.goto('http://localhost:5173/login');
    
    console.log("Entering email...");
    await page.locator('input[type="email"]').fill('admin@trendy.com');
    
    console.log("Entering password...");
    await page.locator('input[type="password"]').fill('admin123');
    
    console.log("Submitting login form...");
    await page.locator('button[type="submit"]').click();
    
    console.log("Waiting for navigation to admin panel...");
    await page.waitForURL('**/admin', { timeout: 15000 });
    await page.waitForTimeout(4000);
  } finally {
    console.log("--- BROWSER CONSOLE LOGS ---");
    console.log(logs.join('\n'));

    console.log("--- BROWSER ERRORS ---");
    console.log(errors.join('\n\n'));
  }
});
