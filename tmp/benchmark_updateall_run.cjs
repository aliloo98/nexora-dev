const { chromium } = require('../node_modules/playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const url = 'http://127.0.0.1:4174/#section-plan';
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.updateAll === 'function', { timeout: 20000 });
  const headSource = fs.readFileSync('/tmp/head_updateall.js', 'utf8');

  await page.addScriptTag({ content: headSource + '\nwindow.__headUpdateAll = updateAll;' });

  const result = await page.evaluate(() => {
    const ids = [
      'total-revenus','total-fixes','total-variables','kpi-revenus','kpi-fixes','kpi-variables','kpi-solde','kpi-solde-status','kpi-dep-payes','kpi-dep-payes-sub','kpi-solde-est-kpi','kpi-epargne','kpi-epargne-sub','kpi-taux','dash-rev','dash-dep','dash-dep-payees','dash-dep-restantes','dash-solde-est','dash-solde2','rule-needs-actual','rule-wants-actual','rule-savings-actual','rule-recommendation-text'
    ];
    const captureSnapshot = () => {
      const snapshot = {};
      ids.forEach(id => {
        const el = document.getElementById(id);
        snapshot[id] = el ? { text: el.textContent.trim(), className: el.className || null, style: el.getAttribute('style') || null } : null;
      });
      return snapshot;
    };
    const compareSnapshots = (a, b) => {
      const diff = {};
      Object.keys(a).forEach(key => {
        const aval = a[key];
        const bval = b[key];
        if (JSON.stringify(aval) !== JSON.stringify(bval)) {
          diff[key] = { current: aval, head: bval };
        }
      });
      return diff;
    };

    const instrumentAndMeasure = (fn) => {
      const counters = { querySelector: 0, getElementById: 0, getBudgetKeysByType: 0, getVal: 0, parseBudgetNumber: 0 };
      const original = {
        querySelector: document.querySelector.bind(document),
        getElementById: document.getElementById.bind(document),
        getBudgetKeysByType: window.getBudgetKeysByType,
        getVal: window.getVal,
        parseBudgetNumber: window.parseBudgetNumber
      };
      document.querySelector = function(sel) { counters.querySelector++; return original.querySelector(sel); };
      document.getElementById = function(id) { counters.getElementById++; return original.getElementById(id); };
      if (original.getBudgetKeysByType) {
        window.getBudgetKeysByType = function(type) { counters.getBudgetKeysByType++; return original.getBudgetKeysByType(type); };
      }
      if (original.getVal) {
        window.getVal = function(key) { counters.getVal++; return original.getVal(key); };
      }
      if (original.parseBudgetNumber) {
        window.parseBudgetNumber = function(value) { counters.parseBudgetNumber++; return original.parseBudgetNumber(value); };
      }

      for (let i = 0; i < 5; i++) fn();
      const times = [];
      for (let i = 0; i < 15; i++) {
        const t0 = performance.now();
        fn();
        const t1 = performance.now();
        times.push(t1 - t0);
      }

      document.querySelector = original.querySelector;
      document.getElementById = original.getElementById;
      if (original.getBudgetKeysByType) window.getBudgetKeysByType = original.getBudgetKeysByType;
      if (original.getVal) window.getVal = original.getVal;
      if (original.parseBudgetNumber) window.parseBudgetNumber = original.parseBudgetNumber;
      const mean = times.reduce((a, b) => a + b, 0) / times.length;
      return { counters, stats: { mean, min: Math.min(...times), max: Math.max(...times) } };
    };
    const currentBefore = captureSnapshot();
    const currentMetrics = instrumentAndMeasure(window.updateAll);
    const currentAfter = captureSnapshot();
    const headMetrics = instrumentAndMeasure(window.__headUpdateAll);
    const headAfter = captureSnapshot();
    const diff = compareSnapshots(currentAfter, headAfter);
    return { currentMetrics, headMetrics, diff, currentBefore, currentAfter, headAfter, pageTitle: document.title, url: location.href };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
