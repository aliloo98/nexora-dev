let planReady = false
let nexoraReady = false
let planRenderPromise = null
let nexoraRenderPromise = null

export async function ensurePlanHub() {
  if (!document.getElementById('plan-root')) return
  if (planReady) {
    await window.refreshPlanHub?.()
    return
  }
  if (!planRenderPromise) {
    planRenderPromise = (async () => {
      const { renderPlanHub } = await import('../plan/PlanHubUI.js')
      await renderPlanHub('plan-root')
      window.refreshPlanHub = async () => {
        const { renderPlanHub: render } = await import('../plan/PlanHubUI.js')
        return render('plan-root')
      }
      planReady = true
    })()
  }
  await planRenderPromise
}

export async function ensureNexoraAdvisor() {
  if (!document.getElementById('nexora-page-root')) return
  if (nexoraReady) return
  if (!nexoraRenderPromise) {
    nexoraRenderPromise = (async () => {
      const { renderAdvisorUI } = await import('../advisor/AdvisorUI.js')
      const AdvisorService = (await import('../advisor/advisorService.js')).default
      renderAdvisorUI('nexora-page-root', AdvisorService)
      nexoraReady = true
    })()
  }
  await nexoraRenderPromise
}

export const NexoraSections = {
  ensurePlan: ensurePlanHub,
  ensureNexora: ensureNexoraAdvisor
}

export default NexoraSections
