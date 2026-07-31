import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const distDir = join(process.cwd(), 'dist')
const outputDir = join(process.cwd(), 'screenshots_time')

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
}

function startServer(port = 5199) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(distDir, req.url === '/' ? 'index.html' : req.url)
      if (!existsSync(filePath)) {
        filePath = join(distDir, 'index.html')
      }
      const ext = extname(filePath)
      const contentType = mimeTypes[ext] || 'application/octet-stream'
      try {
        const content = readFileSync(filePath)
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(content)
      } catch (err) {
        res.writeHead(404)
        res.end('Not found')
      }
    })
    server.listen(port, () => {
      console.log(`Server running at http://127.0.0.1:${port}`)
      resolve(server)
    })
  })
}

async function capture() {
  const server = await startServer(5199)
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({ viewport: { width: 1280, height: 1200 } })
  const page = await context.newPage()

  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'networkidle' })

  // Setup auth and financial data
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
  })

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  // Re-verify auth unlock after reload
  await page.evaluate(() => {
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
  })

  const cases = [
    { iso: '2026-05', name: 'past_month_2026_05.png' },
    { iso: '2026-08', name: 'current_month_2026_08.png' },
    { iso: '2026-09', name: 'future_month_2026_09.png' }
  ]

  for (const c of cases) {
    console.log(`Testing & Capturing ${c.iso}...`)
    await page.evaluate((iso) => {
      const select = document.getElementById('monthSelect')
      if (select) {
        select.value = iso
        select.dispatchEvent(new Event('change'))
      }
      if (typeof window.updateAll === 'function') {
        window.updateAll()
      }
    }, c.iso)

    await page.waitForTimeout(500)
    await page.screenshot({ path: join(outputDir, c.name), fullPage: false })
    console.log(`Saved ${c.name}`)
  }

  await browser.close()
  server.close()
  console.log('TIME_ENGINE_CAPTURE_SUCCESS')
}

capture().catch(err => {
  console.error('Error during capture:', err)
  process.exit(1)
})
