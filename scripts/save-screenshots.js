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
  await page.waitForTimeout(300);

  const corePath = path.join(outDir, 'nexora-iphone14-core.png');
  const fullPath = path.join(outDir, 'nexora-iphone14-dashboard.png');

  const coreEl = await page.$('.nexora-core-stage');
  if (coreEl) {
    await coreEl.screenshot({ path: corePath });
    console.log('WROTE_CORE', corePath);
  } else {
    console.log('NO_CORE_ELEMENT');
  }

  await page.screenshot({ path: fullPath, fullPage: true });
  console.log('WROTE_FULL', fullPath);

  await browser.close();

  // read back dimensions
  function pngDims(buffer) {
    if (!buffer || buffer.length < 24) return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  const coreBuf = fs.existsSync(corePath) ? fs.readFileSync(corePath) : null;
  const fullBuf = fs.existsSync(fullPath) ? fs.readFileSync(fullPath) : null;

  console.log('CORE_DIMS', coreBuf ? pngDims(coreBuf) : null, 'CORE_SIZE', coreBuf ? coreBuf.length : 0);
  console.log('FULL_DIMS', fullBuf ? pngDims(fullBuf) : null, 'FULL_SIZE', fullBuf ? fullBuf.length : 0);
})();