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

export function startJarvisCoreAmbientMotion(cockpitElement, interval = 10000) {
  if (!cockpitElement) return null
  const anim = () => {
    if (cockpitElement.dataset.motion !== 'ambient') return
    const s = cockpitElement.querySelectorAll('.jarvis-hero, .jarvis-priority-card, .jarvis-trajectory-panel')
    if (s[0]) {
      const t = s[0].style.transform || 'translateY(0) scale(1)'
      s[0].style.transition = 'transform 400ms ease-in-out'
      s[0].style.transform = 'translateY(-1px) scale(1.002)'
      setTimeout(() => s[0].style.transform = t, 400)
    }
    const cs = cockpitElement.querySelector('.jarvis-core-signal')
    if (cs) {
      const or = cs.querySelector('.jarvis-core-outer')
      const ar = cs.querySelector('.jarvis-core-arc')
      const ic = cs.querySelector('.jarvis-core-inner')
      if (or) {
        const ot = or.style.transform || 'rotate(0deg)'
        or.style.transition = 'transform 6000ms linear'
        or.style.transform = 'rotate(360deg)'
        setTimeout(() => or.style.transform = ot, 6000)
      }
      if (ar) {
        const at = ar.style.transform || 'rotate(0deg)'
        ar.style.transition = 'transform 4000ms linear'
        ar.style.transform = 'rotate(-360deg)'
        setTimeout(() => ar.style.transform = at, 4000)
      }
      if (ic) {
        const io = ic.style.opacity || '1'
        ic.style.transition = 'opacity 2000ms ease-in-out'
        ic.style.opacity = '0.95'
        setTimeout(() => ic.style.opacity = io, 2000)
      }
    }
  }
  setTimeout(anim, 4000)
  const iv = setInterval(anim, interval)
  return { interval: iv, cleanup: () => clearInterval(iv) }
}
  export function startJarvisCoreAmbientMotion(cockpitElement) {
    if (!cockpitElement) return null

    // Create animations using the Web Animations API where possible.
    const animations = []

    // Small hover/float animation for primary hero surface
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

    const visHandler = () => {
      if (document.hidden) {
        animations.forEach(a => a.pause())
      }
    }

    document.addEventListener('visibilitychange', visHandler)

    const resume = () => {
      if (document.hidden) return
      animations.forEach(a => a.play())
    }
    const pause = () => animations.forEach(a => a.pause())
    const cleanup = () => {
      document.removeEventListener('visibilitychange', visHandler)
      animations.forEach(a => a.cancel())
    }

    return { resume, pause, cleanup }
  }

export function startGraphAmbientMotion(linePath, hoverDot, interval = 8000) {
  if (!linePath) return null
  const animation = () => {
    if (document.hidden || linePath.dataset.motionState !== 'ambient') return
    if (hoverDot) {
      const originalOpacity = hoverDot.style.opacity || '0.85'
      const originalTransform = hoverDot.style.transform || 'scale(1)'
      hoverDot.style.transition = 'opacity 400ms ease-in-out, transform 400ms ease-in-out'
      hoverDot.style.opacity = '1'
      hoverDot.style.transform = 'scale(1.08)'
      setTimeout(() => {
        hoverDot.style.opacity = originalOpacity
        hoverDot.style.transform = originalTransform
      }, 400)
    }
    const originalStrokeOpacity = linePath.style.strokeOpacity || '1'
    linePath.style.transition = 'stroke-opacity 600ms ease-in-out'
    linePath.style.strokeOpacity = '0.85'
    setTimeout(() => {
      linePath.style.strokeOpacity = originalStrokeOpacity
    }, 600)
  }
  setTimeout(animation, 3000)
  const animInterval = setInterval(animation, interval)
  return { interval: animInterval, cleanup: () => clearInterval(animInterval) }
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

export function startDonutAmbientMotion(segCharges, segEpargne, interval = 7000) {
  if (!segCharges) return null
  const animation = () => {
    if (document.hidden || segCharges.dataset.motionState !== 'ambient') return
    const originalStrokeWidth = segCharges.style.strokeWidth || '2'
    segCharges.style.transition = 'stroke-width 500ms ease-in-out'
    segCharges.style.strokeWidth = '2.5'
    setTimeout(() => {
      segCharges.style.strokeWidth = originalStrokeWidth
    }, 500)
    const originalOpacity = segEpargne.style.strokeOpacity || '1'
    segEpargne.style.transition = 'stroke-opacity 600ms ease-in-out'
    segEpargne.style.strokeOpacity = '0.9'
    setTimeout(() => {
      segEpargne.style.strokeOpacity = originalOpacity
    }, 600)
  }
  setTimeout(animation, 2500)
  const animInterval = setInterval(animation, interval)
  return { interval: animInterval, cleanup: () => clearInterval(animInterval) }
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

export function startProgressAmbientSweep(element, duration = 1500, interval = 6000) {
  if (!element) return null
  const animation = () => {
    if (document.hidden || element.dataset.motionState !== 'ambient') return
    element.style.background = 'linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255, 255, 255, 0.15) 50%, transparent 60%, transparent 100%)'
    element.style.backgroundSize = '200% 100%'
    element.style.backgroundPosition = '200% 0'
    requestAnimationFrame(() => {
      element.style.transition = `background-position ${duration}ms ease-out`
      element.style.backgroundPosition = '-200% 0'
    })
    setTimeout(() => {
      element.style.background = ''
      element.style.backgroundSize = ''
      element.style.backgroundPosition = ''
    }, duration)
  }
  setTimeout(animation, 2000)
  const animInterval = setInterval(animation, interval)
  return { interval: animInterval, cleanup: () => clearInterval(animInterval) }
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
