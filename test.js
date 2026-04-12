const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.error('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:3000');
  await page.waitForTimeout(3000);
  
  await page.goto('http://localhost:3000/social');
  await page.waitForTimeout(3000);
  
  await page.goto('http://localhost:3000/features');
  await page.waitForTimeout(3000);

  await browser.close();
  console.log("Done");
})();
