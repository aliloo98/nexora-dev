// Ambient motion utilities shared between Jarvis cockpit and dashboard quick view

export function setupAmbientMotion(element, ambientCallback, threshold = 0.1) {
  if (!element) {
    ambientCallback(true)
    return null
  }

  const isInViewport = () => {
    const rect = element.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    return rect.top < viewportHeight && rect.bottom > 0
  }
  const checkViewport = () => ambientCallback(isInViewport())
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      ambientCallback(entry.isIntersecting)
    })
  }, { threshold, rootMargin: '0px 0px -50px 0px' })

  window.addEventListener('scroll', checkViewport, true)
  observer.observe(element)
  checkViewport()
  const disconnect = observer.disconnect.bind(observer)
  observer.disconnect = () => {
    window.removeEventListener('scroll', checkViewport, true)
    disconnect()
  }
  return observer
}

export function startJarvisCoreAmbientMotion(cockpitElement) {
  if (!cockpitElement) return null

  const animations = []

  const hero = cockpitElement.querySelector('.jarvis-hero')
  if (hero) {
    const a = hero.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-1px) scale(1.002)' },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 1200, iterations: Infinity, easing: 'ease-in-out' })
    a.pause()
    animations.push(a)
  }

  const cs = cockpitElement.querySelector('.jarvis-core-signal')
  if (cs) {
    const or = cs.querySelector('.jarvis-core-outer')
    const ar = cs.querySelector('.jarvis-core-arc')
    const ic = cs.querySelector('.jarvis-core-inner')
    if (or) {
      const a = or.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 6000, iterations: Infinity, easing: 'linear' })
      a.pause()
      animations.push(a)
    }
    if (ar) {
      const a = ar.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-360deg)' }], { duration: 4000, iterations: Infinity, easing: 'linear' })
      a.pause()
      animations.push(a)
    }
    if (ic) {
      const a = ic.animate([{ opacity: 1 }, { opacity: 0.95 }, { opacity: 1 }], { duration: 2000, iterations: Infinity, easing: 'ease-in-out' })
      a.pause()
      animations.push(a)
    }
  }

  const visHandler = () => { if (document.hidden) animations.forEach(a => a.pause()) }
  document.addEventListener('visibilitychange', visHandler)

  const resume = () => { if (document.hidden) return; animations.forEach(a => a.play()) }
  const pause = () => animations.forEach(a => a.pause())
  const cleanup = () => { document.removeEventListener('visibilitychange', visHandler); animations.forEach(a => a.cancel()) }

  return { resume, pause, cleanup }
}

export function startGraphAmbientMotion(linePath, hoverDot) {
  if (!linePath) return null

  const animations = []
  const highlight = linePath.parentElement?.querySelector('#treasury-line-highlight')
  const cardSheen = linePath.closest('.treasury-chart-wrapper')?.querySelector('.treasury-card-sheen')

  if (cardSheen) {
    const cardSheenAnim = cardSheen.animate([
      { transform: 'translateX(0)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 0 },
      { transform: 'translateX(500%)', opacity: 0.55 },
      { transform: 'translateX(500%)', opacity: 0 },
      { transform: 'translateX(500%)', opacity: 0 }
    ], { duration: 6500, iterations: Infinity, easing: 'ease-in-out' })
    cardSheenAnim.pause()
    animations.push(cardSheenAnim)
  }

  if (highlight) {
    const highlightAnim = highlight.animate([
      { strokeDashoffset: '520', opacity: 0 },
      { strokeDashoffset: '520', opacity: 0 },
      { strokeDashoffset: '0', opacity: 0.72 },
      { strokeDashoffset: '-26', opacity: 0 },
      { strokeDashoffset: '-26', opacity: 0 }
    ], { duration: 5600, iterations: Infinity, easing: 'ease-in-out' })
    highlightAnim.pause()
    animations.push(highlightAnim)
  }

  let hoverAnim = null
  if (hoverDot) {
    hoverAnim = hoverDot.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' }
    ], { duration: 5000, iterations: Infinity, easing: 'ease-in-out' })
    hoverAnim.pause()
    animations.push(hoverAnim)
  }

  const visHandler = () => { if (document.hidden) animations.forEach(a => a.pause()) }
  document.addEventListener('visibilitychange', visHandler)

  const resume = () => { if (document.hidden) return; animations.forEach(a => a.play()) }
  const pause = () => animations.forEach(a => a.pause())
  const cleanup = () => { document.removeEventListener('visibilitychange', visHandler); animations.forEach(a => a.cancel()) }

  return { resume, pause, cleanup }
}

export function startDonutAmbientMotion(segCharges, segEpargne) {
  if (!segCharges) return null

  const animations = []
  const glint = segCharges.parentElement?.querySelector('#donut-perimeter-glint')

  if (glint) {
    const glintAnim = glint.animate([
      { strokeDashoffset: '238.76', opacity: 0 },
      { strokeDashoffset: '238.76', opacity: 0 },
      { strokeDashoffset: '0', opacity: 0.78 },
      { strokeDashoffset: '-7', opacity: 0 },
      { strokeDashoffset: '-7', opacity: 0 }
    ], { duration: 4800, iterations: Infinity, easing: 'ease-in-out' })
    glintAnim.pause()
    animations.push(glintAnim)
  }

  const pulse = segCharges.animate([
    { opacity: 1 },
    { opacity: 1 },
    { opacity: 0.84 },
    { opacity: 1 },
    { opacity: 1 }
  ], { duration: 5000, iterations: Infinity, easing: 'ease-in-out' })
  pulse.pause()
  animations.push(pulse)

  if (segEpargne) {
    const ep = segEpargne.animate([
      { opacity: 1 },
      { opacity: 1 },
      { opacity: 0.86 },
      { opacity: 1 },
      { opacity: 1 }
    ], { duration: 5300, delay: 1600, iterations: Infinity, easing: 'ease-in-out' })
    ep.pause()
    animations.push(ep)
  }

  const visHandler = () => { if (document.hidden) animations.forEach(a => a.pause()) }
  document.addEventListener('visibilitychange', visHandler)

  const resume = () => { if (document.hidden) return; animations.forEach(a => a.play()) }
  const pause = () => animations.forEach(a => a.pause())
  const cleanup = () => { document.removeEventListener('visibilitychange', visHandler); animations.forEach(a => a.cancel()) }

  return { resume, pause, cleanup }
}

export function startProgressAmbientSweep(element, duration = 1500) {
  if (!element) return null

  const sheen = element.querySelector('.goal-milestone-bar-sheen')
  if (!sheen) return null

  const anim = sheen.animate([
    { transform: 'translateX(-150%)', opacity: 0 },
    { transform: 'translateX(-150%)', opacity: 0 },
    { transform: 'translateX(300%)', opacity: 0.9 },
    { transform: 'translateX(300%)', opacity: 0 },
    { transform: 'translateX(300%)', opacity: 0 }
  ], { duration: 4000, iterations: Infinity, easing: 'ease-in-out' })
  anim.pause()

  const visHandler = () => { if (document.hidden) anim.pause() }
  document.addEventListener('visibilitychange', visHandler)

  const resume = () => { if (document.hidden) return; anim.play() }
  const pause = () => anim.pause()
  const cleanup = () => { document.removeEventListener('visibilitychange', visHandler); anim.cancel() }

  return { resume, pause, cleanup }
}
