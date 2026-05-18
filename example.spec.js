const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();

  const page = await context.newPage();
  await page.goto('https://www.udemy.com/');

  console.log("👉 Log in manually...");

  // wait until you finish login
  await page.waitForTimeout(60000); // 1 min (adjust if needed)

  // save session
  await context.storageState({ path: 'state.json' });

  console.log("✅ Session saved!");
  await browser.close();
})();