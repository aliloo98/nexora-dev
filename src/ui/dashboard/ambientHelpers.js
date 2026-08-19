import { setupAmbientMotion, startGraphAmbientMotion, startDonutAmbientMotion, startProgressAmbientSweep } from '../../jarvis/motion/jarvisAmbientMotion.js'

export function setupViewportReveal(element, animationCallback, threshold = 0.25) {
  if (!element || !window.IntersectionObserver) {
    animationCallback()
    return
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        observer.unobserve(entry.target)
        try { window.removeEventListener('scroll', onScroll, true) } catch (e) {}
        animationCallback()
      }
    })
  }, { threshold, rootMargin: '0px 0px -100px 0px' })

  observer.observe(element)
  // If element is already in viewport (e.g., after scrollIntoView), trigger immediately
  const rect = element.getBoundingClientRect()
  const inViewport = rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom > 0
  if (inViewport) {
    observer.unobserve(element)
    animationCallback()
    return null
  }

  // Also listen for scroll events to handle programmatic scrollIntoView races
  const onScroll = () => {
    const r = element.getBoundingClientRect()
    const nowIn = r.top < (window.innerHeight || document.documentElement.clientHeight) && r.bottom > 0
    if (nowIn) {
      observer.unobserve(element)
      window.removeEventListener('scroll', onScroll, true)
      animationCallback()
    }
  }
  window.addEventListener('scroll', onScroll, true)

  return observer
}

export function attachAmbientController(element, starter) {
  if (!element) return null
  // cleanup any previous controller/observer
  if (element.__ambientController) {
    try { element.__ambientController.cleanup() } catch (e) {}
    element.__ambientController = null
  }
  if (element.__ambientObserver) {
    try { element.__ambientObserver.disconnect() } catch (e) {}
    element.__ambientObserver = null
  }

  const controller = starter(element)
  element.__ambientController = controller
  const observer = setupAmbientMotion(element, (isVisible) => {
    if (!element.__ambientController) return
    if (isVisible && element.dataset.motionState === 'ambient') {
      element.__ambientController.resume()
    } else {
      element.__ambientController.pause()
    }
  })
  element.__ambientObserver = observer

  // If element is currently visible, resume immediately
  const rect = element.getBoundingClientRect()
  const inViewport = rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom > 0
  if (inViewport && element.dataset.motionState === 'ambient') {
    controller.resume()
  }

  return controller
}

export default { setupViewportReveal, attachAmbientController }
