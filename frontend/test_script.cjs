const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173/interview', { waitUntil: 'networkidle2' });
  
  // Select Coding Round
  const selects = await page.$$('select');
  if (selects.length >= 3) {
      await selects[2].select('Coding Round');
      console.log('Selected Coding Round');
  }

  // Click Start
  const btn = await page.$('button');
  if (btn) {
      await btn.click();
      console.log('Clicked Start');
  }

  await new Promise(r => setTimeout(r, 5000));

  await browser.close();
})();
