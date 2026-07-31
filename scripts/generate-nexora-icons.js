import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { join } from 'path'

const projectRoot = process.cwd()
const publicDir = join(projectRoot, 'public')

// Clean continuous geometric letter "N" path without transforms or clipping issues
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#091024" />
      <stop offset="50%" stop-color="#101a38" />
      <stop offset="100%" stop-color="#060b18" />
    </linearGradient>
    <radialGradient id="aura" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stop-color="#d4af37" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#d4af37" stop-opacity="0.0" />
    </radialGradient>
    <linearGradient id="goldMetallic" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#fffdf0" />
      <stop offset="22%" stop-color="#fef08a" />
      <stop offset="48%" stop-color="#eab308" />
      <stop offset="75%" stop-color="#ca8a04" />
      <stop offset="100%" stop-color="#854d0e" />
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.55" />
      <stop offset="50%" stop-color="#d4af37" stop-opacity="0.30" />
      <stop offset="100%" stop-color="#854d0e" stop-opacity="0.15" />
    </linearGradient>
  </defs>

  <!-- Background Squircle -->
  <rect x="8" y="8" width="496" height="496" rx="112" ry="112" fill="url(#bgGrad)" />
  
  <!-- Soft Subdued Radial Ambient Glow -->
  <circle cx="256" cy="245" r="160" fill="url(#aura)" />

  <!-- Gold Border Ring -->
  <rect x="8" y="8" width="496" height="496" rx="112" ry="112" fill="none" stroke="url(#borderGrad)" stroke-width="4" />

  <!-- Perfectly Centered Geometric Brand Emblem "N" -->
  <path d="M 156 361 V 151 H 200 L 312 317 V 151 H 356 V 361 H 312 L 200 195 V 361 Z" fill="url(#goldMetallic)" />
</svg>`

const maskableSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#091024" />
      <stop offset="50%" stop-color="#101a38" />
      <stop offset="100%" stop-color="#060b18" />
    </linearGradient>
    <radialGradient id="aura" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stop-color="#d4af37" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#d4af37" stop-opacity="0.0" />
    </radialGradient>
    <linearGradient id="goldMetallic" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#fffdf0" />
      <stop offset="22%" stop-color="#fef08a" />
      <stop offset="48%" stop-color="#eab308" />
      <stop offset="75%" stop-color="#ca8a04" />
      <stop offset="100%" stop-color="#854d0e" />
    </linearGradient>
  </defs>

  <rect width="512" height="512" fill="url(#bgGrad)" />
  <circle cx="256" cy="245" r="180" fill="url(#aura)" />

  <!-- Maskable scaled N (safe zone 80%) -->
  <path d="M 176 340 V 172 H 211 L 301 305 V 172 H 336 V 340 H 301 L 211 207 V 340 Z" fill="url(#goldMetallic)" />
</svg>`

async function main() {
  console.log('Generating corrected official Nexora icons...')

  writeFileSync(join(projectRoot, 'favicon.svg'), svgContent)
  writeFileSync(join(publicDir, 'favicon.svg'), svgContent)

  const browser = await chromium.launch({ args: ['--no-sandbox'] })

  const renderPng = async (svg, size, filename) => {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    await page.goto(dataUrl)
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
  console.log('NEXORA_CORRECTED_ICON_SUCCESS')
}

main().catch(err => {
  console.error('Error generating icons:', err)
  process.exit(1)
})
