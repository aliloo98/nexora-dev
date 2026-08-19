// Ambient motion utilities shared between Jarvis cockpit and dashboard quick view

export function setupAmbientMotion(element, ambientCallback, threshold = 0.1) {
  if (!element) {
    ambientCallback(true)
    return null
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      ambientCallback(entry.isIntersecting)
    })
  }, { threshold, rootMargin: '0px 0px -50px 0px' })

  observer.observe(element)
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

  const lineAnim = linePath.animate([
    { strokeOpacity: 1 },
    { strokeOpacity: 0.85 },
    { strokeOpacity: 1 }
  ], { duration: 1200, iterations: Infinity, easing: 'ease-in-out' })
  lineAnim.pause()
  animations.push(lineAnim)

  let hoverAnim = null
  if (hoverDot) {
    hoverAnim = hoverDot.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.08)' },
      { transform: 'scale(1)' }
    ], { duration: 800, iterations: Infinity, easing: 'ease-in-out' })
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

  const pulse = segCharges.animate([
    { strokeWidth: '2' },
    { strokeWidth: '2.5' },
    { strokeWidth: '2' }
  ], { duration: 1000, iterations: Infinity, easing: 'ease-in-out' })
  pulse.pause()
  animations.push(pulse)

  if (segEpargne) {
    const ep = segEpargne.animate([{ strokeOpacity: 1 }, { strokeOpacity: 0.9 }, { strokeOpacity: 1 }], { duration: 1200, iterations: Infinity, easing: 'ease-in-out' })
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

  const anim = element.animate([
    { backgroundPosition: '200% 0' },
    { backgroundPosition: '-200% 0' }
  ], { duration, iterations: Infinity, easing: 'ease-out' })
  anim.pause()

  const visHandler = () => { if (document.hidden) anim.pause() }
  document.addEventListener('visibilitychange', visHandler)

  const resume = () => { if (document.hidden) return; anim.play() }
  const pause = () => anim.pause()
  const cleanup = () => { document.removeEventListener('visibilitychange', visHandler); anim.cancel() }

  return { resume, pause, cleanup }
}
