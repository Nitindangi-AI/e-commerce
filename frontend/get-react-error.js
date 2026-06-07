import { chromium } from 'playwright';

async function run() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
    console.log('PAGE STACK:', err.stack);
  });

  try {
    console.log("Navigating to login...");
    await page.goto('http://localhost:5173/login');
    
    // Click 'Continue as Administrator'
    console.log("Selecting Admin Role...");
    // Find button containing Administrator
    await page.locator('text=Continue as Administrator').click();
    
    // Type email
    console.log("Typing credentials...");
    await page.locator('input[type="email"]').fill('admin@trendy.com');
    await page.click('text=Continue Authentication');
    
    // Type password
    await page.locator('input[type="password"]').fill('admin123');
    console.log("Submitting login...");
    await page.click('text=Complete Access Authorization');
    
    console.log("Waiting for navigation...");
    await page.waitForTimeout(3000);
    console.log("Current URL:", page.url());
  } catch (err) {
    console.error("Script error:", err);
  } finally {
    await browser.close();
  }
}

run();
