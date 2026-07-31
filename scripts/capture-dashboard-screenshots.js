import { chromium } from 'playwright'
import http from 'http'
import fs from 'fs'
import path from 'path'

const ARTIFACT_DIR = '/Users/macbookair/.gemini/antigravity/brain/d1f4a849-c6a2-4548-923b-434758ca0125/screenshots'
const DIST_DIR = path.resolve(process.cwd(), 'dist')

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json'
}

function startStaticServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url)
      if (!fs.existsSync(filePath)) {
        filePath = path.join(DIST_DIR, 'index.html')
      }
      const ext = path.extname(filePath)
      const contentType = mimeTypes[ext] || 'application/octet-stream'
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500)
          res.end('Server Error')
        } else {
          res.writeHead(200, { 'Content-Type': contentType })
          res.end(content, 'utf-8')
        }
      })
    })

    server.listen(port, '127.0.0.1', () => {
      console.log(`Static server running at http://127.0.0.1:${port}`)
      resolve(server)
    })
  })
}

async function capture() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
  }

  const server = await startStaticServer(5198)
  const url = 'http://127.0.0.1:5198'

  console.log('Launching browser...')
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const setupContext = async (viewport, isMobile = false) => {
    const context = await browser.newContext({
      viewport,
      isMobile
    })

    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })

    await page.evaluate(() => {
      const demoUser = {
        id: 'demo-user-123',
        email: 'alex@nexora.app',
        user_metadata: { full_name: 'Alex' }
      }
      const demoSession = {
        access_token: 'demo-token',
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 30,
        user: demoUser
      }

      localStorage.setItem('nexora_auth_user', JSON.stringify(demoUser))
      localStorage.setItem('nexora_auth_session', JSON.stringify(demoSession))
      localStorage.setItem('nexora_onboarding_state_v1', JSON.stringify({ completed: true }))

      const sampleSettings = {
        target_epargne: '500',
        rev_fixe: '2500',
        charges_fixes: '1100'
      }
      localStorage.setItem('user_app_settings', JSON.stringify(sampleSettings))

      // Force UI to hide auth modal and display main dashboard
      document.body.classList.remove('auth-locked')
      const authContainer = document.getElementById('auth-container')
      if (authContainer) authContainer.style.display = 'none'
      const main = document.querySelector('main')
      if (main) main.style.display = 'block'
      const sidebar = document.querySelector('.sidebar')
      if (sidebar) sidebar.style.display = 'flex'

      const sectionDashboard = document.getElementById('section-dashboard')
      if (sectionDashboard) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
        sectionDashboard.classList.add('active')
      }

      if (typeof window.AuthPages?.hideAuthPages === 'function') {
        window.AuthPages.hideAuthPages()
      }

      // Update calculations
      if (typeof window.updateAll === 'function') window.updateAll()
    })

    await page.waitForTimeout(1000)
    return { context, page }
  }

  // 1. Desktop Context
  console.log('Capturing Desktop...')
  const { page: desktopPage } = await setupContext({ width: 1440, height: 900 })

  // Mode Simplifié Desktop
  await desktopPage.evaluate(() => {
    if (typeof window.setNexoraUxMode === 'function') window.setNexoraUxMode('simple')
  })
  await desktopPage.waitForTimeout(500)
  const desktopSimplePath = path.join(ARTIFACT_DIR, 'desktop_simple.png')
  await desktopPage.screenshot({ path: desktopSimplePath, fullPage: true })
  console.log(`Saved ${desktopSimplePath}`)

  // Mode Complet Desktop
  await desktopPage.evaluate(() => {
    if (typeof window.setNexoraUxMode === 'function') window.setNexoraUxMode('complete')
  })
  await desktopPage.waitForTimeout(500)
  const desktopCompletePath = path.join(ARTIFACT_DIR, 'desktop_complete.png')
  await desktopPage.screenshot({ path: desktopCompletePath, fullPage: true })
  console.log(`Saved ${desktopCompletePath}`)

  // 2. Mobile Context
  console.log('Capturing Mobile...')
  const { page: mobilePage } = await setupContext({ width: 390, height: 844 }, true)

  // Mode Simplifié Mobile
  await mobilePage.evaluate(() => {
    if (typeof window.setNexoraUxMode === 'function') window.setNexoraUxMode('simple')
  })
  await mobilePage.waitForTimeout(500)
  const mobileSimplePath = path.join(ARTIFACT_DIR, 'mobile_simple.png')
  await mobilePage.screenshot({ path: mobileSimplePath, fullPage: true })
  console.log(`Saved ${mobileSimplePath}`)

  // Mode Complet Mobile
  await mobilePage.evaluate(() => {
    if (typeof window.setNexoraUxMode === 'function') window.setNexoraUxMode('complete')
  })
  await mobilePage.waitForTimeout(500)
  const mobileCompletePath = path.join(ARTIFACT_DIR, 'mobile_complete.png')
  await mobilePage.screenshot({ path: mobileCompletePath, fullPage: true })
  console.log(`Saved ${mobileCompletePath}`)

  await browser.close()
  server.close()
  console.log('CAPTURE_SUCCESS')
}

capture().catch(err => {
  console.error('Error during capture:', err)
  process.exit(1)
})
