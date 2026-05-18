const { chromium } = require('playwright');
const fs = require('fs');

// Create a pause function to stop rate limiting
const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  const COURSE_ID = 625204; // Ensure this is your correct course ID

  console.log("🚀 Starting...");

  // Force page to load completely before executing scripts
  await page.goto('https://www.udemy.com', { waitUntil: 'domcontentloaded' });

  // 1. Get all lectures
  const lectures = await page.evaluate(async (courseId) => {
    const res = await fetch(
      `/api-2.0/courses/${courseId}/subscriber-curriculum-items/?page_size=200`
    );
    
    if (!res.ok) throw new Error(`Curriculum API failed: ${res.status}`);
    const data = await res.json();

    return data.results
      .filter(i => i._class === "lecture" && i.asset?.asset_type === "Video")
      .map(l => l.id);
  }, COURSE_ID);

  console.log("🎥 Total video lectures:", lectures.length);

  let allText = "";

  // 2. Loop lectures with a delay
  for (let lecId of lectures) {
    try {
      // Pause for 2 seconds to avoid Udemy security blocks
      await delay(2000);

      const data = await page.evaluate(async ({ courseId, lecId }) => {
        const res = await fetch(
          `/api-2.0/users/me/subscribed-courses/${courseId}/lectures/${lecId}/?fields[lecture]=asset&fields[asset]=captions`
        );
        
        if (!res.ok) throw new Error(`Lecture API failed: ${res.status}`);
        return await res.json();
      }, { courseId: COURSE_ID, lecId });

      if (!data?.asset?.captions) {
        console.log("⚠️ No captions:", lecId);
        continue;
      }

      const english = data.asset.captions.find(c => c.locale_id === "en_US");

      if (!english?.url) {
        console.log("⚠️ No English captions:", lecId);
        continue;
      }

      // Fetch VTT via Playwright context to bypass browser CORS
      const vttResponse = await context.request.get(english.url);
      
      if (!vttResponse.ok()) {
        console.log(`❌ Failed VTT HTTP Status: ${vttResponse.status()} for ${lecId}`);
        continue;
      }

      const vtt = await vttResponse.text();

      // Clean transcript
      const clean = vtt
        .split('\n')
        .filter(line =>
          line.trim() &&
          !line.includes('-->') &&
          !line.startsWith('WEBVTT')
        )
        .join(' ');

      allText += "\n\n" + clean;
      console.log("✅ Done:", lecId);

    } catch (error) {
      // Print the actual error message
      console.log(`❌ Error on ${lecId}:`, error.message);
    }
  }

  // 3. Save and close
  fs.writeFileSync('transcript.md', allText);
  console.log("\n📄 Saved transcript.md");
  
  // Disconnect cleanly
  await browser.close(); 
})();