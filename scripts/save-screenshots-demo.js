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

  // inject demo values
  await page.evaluate(() => {
    const set = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    set('#kpi-revenus', '3 000 €');
    set('#total-revenus', '3 000 €');
    set('#kpi-fixes-pct', '27% des revenus');
    set('#kpi-variables-pct', '18% des revenus');
    set('#week-plan-balance', '2 716 €');
    set('#kpi-revenus', '3 000 €');
    set('#card-revenus .kpi-value', '3 000 €');
    // if solde elements exist
    set('#card-solde .kpi-value', '2 716 €');
    set('#card-epargne .kpi-value', '55%');
    set('#card-dettes .kpi-value', '0 €');
    // add some demo lines in the center medallion if present
    const center = document.querySelector('.nexora-core-center-data');
    if (center) {
      const main = center.querySelector('generic, div, span, strong') || center.querySelector('*');
      // find numeric display inside center
      const display = center.querySelector('.core-value, .center-value, .plan-balance-value, strong, .value');
      if (display) display.textContent = '2 716 €';
      // subtitle
      const subtitle = center.querySelector('.core-sub, .center-sub, p, small');
      if (subtitle) subtitle.textContent = 'Solde fin de cycle';
    }
  });

  await page.waitForTimeout(120);

  const corePath = path.join(outDir, 'nexora-iphone14-core-demo.png');
  const fullPath = path.join(outDir, 'nexora-iphone14-dashboard-demo.png');

  const coreEl = await page.$('.nexora-core-stage');
  if (coreEl) {
    await coreEl.screenshot({ path: corePath });
    console.log('WROTE_CORE_DEMO', corePath);
  } else {
    console.log('NO_CORE_ELEMENT_DEMO');
  }

  await page.screenshot({ path: fullPath, fullPage: true });
  console.log('WROTE_FULL_DEMO', fullPath);

  await browser.close();
})();