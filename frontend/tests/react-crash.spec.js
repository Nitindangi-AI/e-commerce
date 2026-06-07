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

  console.log("Navigating to login...");
  await page.goto('http://localhost:5173/login');
  
  console.log("Clicking Administrator role card...");
  await page.locator('text=Continue as Administrator').click();
  
  console.log("Entering email...");
  await page.locator('input[type="email"]').fill('admin@trendy.com');
  await page.click('text=Continue Authentication');
  
  console.log("Entering password...");
  await page.locator('input[type="password"]').fill('admin123');
  await page.click('text=Complete Access Authorization');
  
  console.log("Waiting for navigation to dashboard...");
  await page.waitForURL('**/admin/dashboard', { timeout: 8000 });
  await page.waitForTimeout(3000);

  console.log("--- BROWSER CONSOLE LOGS ---");
  console.log(logs.join('\n'));

  console.log("--- BROWSER ERRORS ---");
  console.log(errors.join('\n\n'));
});
