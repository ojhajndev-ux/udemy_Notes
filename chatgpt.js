const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');

  const page = browser.contexts()[0].pages()[0];

  await page.bringToFront();

  // ✅ NEW: ensure ChatGPT is open
  if (!page.url().includes('chat.openai.com')) {
    await page.goto('https://chat.openai.com');
  }

  // 1. Type in input box
  await page.waitForSelector('div[contenteditable="true"]');

  await page.click('div[contenteditable="true"]');

  await page.keyboard.type(
    'iran news ? explain in simple and short and generate the response in beautiful markdown format',
    { delay: 20 }
  );

  // 2. Press Enter
  await page.keyboard.press('Enter');

  console.log("✅ Message sent");

  // 3. Wait for response
  await page.waitForTimeout(8000);

  // 4. Get last response
  const responses = await page.$$eval(
    '[data-message-author-role="assistant"]',
    els => els.map(e => e.innerText)
  );

  const last = responses[responses.length - 1];

  console.log("\n🧠 Response:\n", last);

  // 5. Save to file
  fs.writeFileSync('output.md', last);

  console.log("📄 Saved to output.md");

})();