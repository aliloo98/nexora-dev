const { chromium } = require('../node_modules/playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4174/#section-plan', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 20000 });
  const headSource = fs.readFileSync('/tmp/head_updateall.js', 'utf8');
  const res = await page.evaluate((source) => {
    return { len: source.length, tail: source.slice(-80), head: source.slice(0,80).replace(/\n/g,'\\n') };
  }, headSource);
  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})();
