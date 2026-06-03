import { chromium } from 'playwright'
import { spawn } from 'child_process'

const workspaceDir = '/Users/macbookair/Desktop/PWA/Nexora-dev'

async function runAudit() {
  console.log('🚀 Starting Vite dev server in workspace...')
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: workspaceDir,
    shell: true
  })

  // Capture dev server output to find port
  let serverUrl = 'http://localhost:5173' // default Vite port
  await new Promise((resolve) => {
    devServer.stdout.on('data', (data) => {
      const output = data.toString()
      if (output.includes('http://localhost:')) {
        const match = output.match(/http:\/\/localhost:\d+/)
        if (match) {
          serverUrl = match[0]
        }
        resolve()
      }
    })
    // Resolve after 4 seconds fallback
    setTimeout(resolve, 4000)
  })

  console.log(`🌍 Connecting to page at ${serverUrl}...`)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto(serverUrl)
  await page.waitForTimeout(1000)

  console.log('🧪 Injecting mock data, enabling Demo Mode and forcing Dashboard visibility...')
  await page.evaluate(() => {
    // Enable demo mode
    localStorage.setItem('nexora_demo_mode_v1', 'on')
    
    const mockDebts = [
      { id: 'debt_1', name: 'Prêt Auto', initial: 15000, remaining: 8500, monthly: 350, rate: 4.5, updated_at: new Date().toISOString() },
      { id: 'debt_2', name: 'Crédit Conso', initial: 5000, remaining: 1200, monthly: 150, rate: 6.2, updated_at: new Date().toISOString() }
    ]
    localStorage.setItem('nexora_debts_v1', JSON.stringify(mockDebts))

    if (window.SafeStorage) {
      window.SafeStorage.setItem('nexora_demo_mode_v1', 'on')
      window.SafeStorage.setItem('nexora_debts_v1', JSON.stringify(mockDebts))
    }

    // Force show the dashboard section and hide auth pages
    const dashboard = document.getElementById('section-dashboard')
    if (dashboard) {
      dashboard.hidden = false
      dashboard.style.display = 'block'
    }
    const authSection = document.getElementById('section-auth')
    if (authSection) {
      authSection.hidden = true
      authSection.style.display = 'none'
    }

    // Force update of dashboard metrics
    if (typeof window.updateAll === 'function') {
      window.updateAll()
    }
  })

  await page.waitForTimeout(2000)

  console.log('🔍 Auditing DOM for .nexora-core-orbit-node elements with layout...')
  const auditResults = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.nexora-core-orbit-node'))
    const graph = document.getElementById('nexora-core-graph')
    const globe = document.getElementById('nexora-core-globe')

    const graphInfo = graph ? {
      width: graph.clientWidth,
      height: graph.clientHeight,
      offsetWidth: graph.offsetWidth,
      offsetHeight: graph.offsetHeight,
      display: window.getComputedStyle(graph).display,
      visibility: window.getComputedStyle(graph).visibility,
      opacity: window.getComputedStyle(graph).opacity,
      zIndex: window.getComputedStyle(graph).zIndex
    } : null

    const globeInfo = globe ? {
      width: globe.clientWidth,
      height: globe.clientHeight,
      display: window.getComputedStyle(globe).display,
      visibility: window.getComputedStyle(globe).visibility,
      overflow: window.getComputedStyle(globe).overflow
    } : null

    const nodesList = nodes.map((node, i) => {
      const style = window.getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      const parentRect = graph ? graph.getBoundingClientRect() : { top: 0, left: 0 }
      return {
        index: i,
        tagName: node.tagName,
        classes: node.className,
        content: node.querySelector('.nexora-core-orbit-node-content')?.textContent || '',
        width: rect.width,
        height: rect.height,
        leftStyle: node.style.left,
        leftInheritedVar: node.style.getPropertyValue('--orbit-radius'),
        computedLeft: style.left,
        computedTop: style.top,
        relativeX: rect.left - parentRect.left + rect.width / 2,
        relativeY: rect.top - parentRect.top + rect.height / 2,
        zIndex: style.zIndex,
        opacity: style.opacity,
        transform: style.transform,
        display: style.display,
        visibility: style.visibility
      }
    })

    return {
      totalNodes: nodes.length,
      graphInfo,
      globeInfo,
      nodesList
    }
  })

  console.log('\n📊 AUDIT RESULTS:')
  console.log(JSON.stringify(auditResults, null, 2))

  console.log('🛑 Shutting down browser and dev server...')
  await browser.close()
  devServer.kill('SIGINT')
  console.log('✅ Audit completed successfully.')
}

runAudit().catch((err) => {
  console.error('❌ Audit script failed:', err)
})
