import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()
const publicDir = join(projectRoot, 'public')

// SVG template duplicating the exact CSS styling of .sidebar-logo::before
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:ital,wght@1,800&amp;display=swap');
      .logo-n {
        font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
        font-style: italic;
        font-size: 265px;
        letter-spacing: -0.06em;
        text-anchor: middle;
        dominant-baseline: central;
      }
      .logo-glow {
        filter: drop-shadow(0px 0px 16px rgba(232, 184, 74, 0.55));
      }
    </style>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070e16" />
      <stop offset="50%" stop-color="#0d1828" />
      <stop offset="100%" stop-color="#050a12" />
    </linearGradient>
    <radialGradient id="aura" cx="50%" cy="35%" r="66%">
      <stop offset="0%" stop-color="#e8b84a" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#e8b84a" stop-opacity="0.0" />
    </radialGradient>
    <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff8db" />
      <stop offset="35%" stop-color="#f5d77f" />
      <stop offset="100%" stop-color="#c9972a" />
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e8b84a" stop-opacity="0.6" />
      <stop offset="50%" stop-color="#e8b84a" stop-opacity="0.34" />
      <stop offset="100%" stop-color="#966d18" stop-opacity="0.15" />
    </linearGradient>
  </defs>

  <!-- Background Squircle matching .sidebar-logo::before -->
  <rect x="8" y="8" width="496" height="496" rx="112" ry="112" fill="url(#bgGrad)" />
  <rect x="8" y="8" width="496" height="496" rx="112" ry="112" fill="url(#aura)" />

  <!-- Gold Border Ring -->
  <rect x="8" y="8" width="496" height="496" rx="112" ry="112" fill="none" stroke="url(#borderGrad)" stroke-width="4" />

  <!-- Exact Sidebar Italic "N" Brand Symbol -->
  <g class="logo-glow">
    <text x="248" y="258" class="logo-n" fill="url(#goldTextGrad)">N</text>
  </g>
</svg>`

const maskableSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:ital,wght@1,800&amp;display=swap');
      .logo-n-maskable {
        font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 800;
        font-style: italic;
        font-size: 220px;
        letter-spacing: -0.06em;
        text-anchor: middle;
        dominant-baseline: central;
      }
      .logo-glow {
        filter: drop-shadow(0px 0px 16px rgba(232, 184, 74, 0.55));
      }
    </style>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070e16" />
      <stop offset="50%" stop-color="#0d1828" />
      <stop offset="100%" stop-color="#050a12" />
    </linearGradient>
    <radialGradient id="aura" cx="50%" cy="35%" r="66%">
      <stop offset="0%" stop-color="#e8b84a" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#e8b84a" stop-opacity="0.0" />
    </radialGradient>
    <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff8db" />
      <stop offset="35%" stop-color="#f5d77f" />
      <stop offset="100%" stop-color="#c9972a" />
    </linearGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bgGrad)" />
  <rect width="512" height="512" fill="url(#aura)" />

  <g class="logo-glow">
    <text x="248" y="258" class="logo-n-maskable" fill="url(#goldTextGrad)">N</text>
  </g>
</svg>`

async function main() {
  console.log('Generating official Nexora icons matching sidebar symbol...')

  writeFileSync(join(projectRoot, 'favicon.svg'), svgContent)
  writeFileSync(join(publicDir, 'favicon.svg'), svgContent)

  const browser = await chromium.launch({ args: ['--no-sandbox'] })

  const renderPng = async (svg, size, filename) => {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:ital,wght@1,800&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
  svg { width: ${size}px; height: ${size}px; display: block; }
</style>
</head>
<body>
${svg}
</body>
</html>`
    await page.setContent(htmlContent, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const buffer = await page.screenshot({ omitBackground: true })
    await page.close()

    writeFileSync(join(projectRoot, filename), buffer)
    writeFileSync(join(publicDir, filename), buffer)
    console.log(`Saved ${filename} (${size}x${size})`)
  }

  await renderPng(svgContent, 512, 'icon-512.png')
  await renderPng(svgContent, 192, 'icon-192.png')
  await renderPng(svgContent, 180, 'apple-touch-icon.png')
  await renderPng(svgContent, 64, 'favicon.png')
  await renderPng(maskableSvgContent, 512, 'maskable-icon-512.png')

  await renderPng(svgContent, 192, 'icon-gold-192.png')
  await renderPng(svgContent, 512, 'icon-gold-512.png')

  await browser.close()
  console.log('NEXORA_SIDEBAR_EXACT_ICON_SUCCESS')
}

main().catch(err => {
  console.error('Error generating icons:', err)
  process.exit(1)
})
