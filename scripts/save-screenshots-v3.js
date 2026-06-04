import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async ()=>{
  const outDir = path.join(process.cwd(),'test-screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const fileUrl = 'file://' + path.join(process.cwd(),'index.html');
  await page.goto(fileUrl, { waitUntil: 'networkidle' }).catch(()=>{});
  await page.waitForTimeout(400);

  const corePath = path.join(outDir, 'nexora-iphone14-core-v3.png');
  const fullPath = path.join(outDir, 'nexora-iphone14-dashboard-v3.png');

  const coreEl = await page.$('.nexora-core-stage');
  if (coreEl) {
    await coreEl.screenshot({ path: corePath });
    console.log('WROTE_CORE_V3', corePath);
  } else {
    console.log('NO_CORE_ELEMENT_V3');
  }

  await page.screenshot({ path: fullPath, fullPage: true });
  console.log('WROTE_FULL_V3', fullPath);

  await browser.close();
})();