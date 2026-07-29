import { OnboardingService } from './onboardingService.js'

const createWelcomeCard = () => {
  const card = document.createElement('div')
  card.className = 'onboarding-welcome-card'
  card.innerHTML = `
    <div class="onboarding-welcome-content">
      <div class="onboarding-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 class="onboarding-title">Bienvenue sur Nexora</h2>
      <p class="onboarding-description">
        Votre cockpit de décision financière. 
        Prenez le contrôle en quelques minutes.
      </p>
      <div class="onboarding-time-estimate">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 6V12L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>Configuration en moins de 2 minutes</span>
      </div>
      <button class="nx-button nx-button--primary onboarding-start-btn" type="button">
        Commencer
      </button>
    </div>
  `
  return card
}

const createChecklistItem = (step, index, isCurrent) => {
  const item = document.createElement('div')
  item.className = `onboarding-checklist-item ${step.completed ? 'completed' : ''} ${isCurrent ? 'current' : ''}`
  item.dataset.stepId = step.id
  
  const checkbox = document.createElement('div')
  checkbox.className = 'onboarding-checkbox'
  checkbox.innerHTML = step.completed ? '✓' : ''
  checkbox.setAttribute('aria-checked', step.completed)
  checkbox.setAttribute('role', 'checkbox')
  
  const content = document.createElement('div')
  content.className = 'onboarding-step-content'
  content.innerHTML = `
    <div class="onboarding-step-title">${step.title}</div>
    <div class="onboarding-step-description">${step.description}</div>
  `
  
  item.appendChild(checkbox)
  item.appendChild(content)
  
  return item
}

const createProgressBar = (progress) => {
  const bar = document.createElement('div')
  bar.className = 'onboarding-progress-bar'
  bar.setAttribute('role', 'progressbar')
  bar.setAttribute('aria-valuenow', progress.percentage)
  bar.setAttribute('aria-valuemin', '0')
  bar.setAttribute('aria-valuemax', '100')
  bar.setAttribute('aria-label', `Progression de l'onboarding: ${progress.completed}/${progress.total} étapes`)
  
  const fill = document.createElement('div')
  fill.className = 'onboarding-progress-fill'
  fill.style.width = `${progress.percentage}%`
  
  bar.appendChild(fill)
  
  return bar
}

const createProgressText = (progress) => {
  const text = document.createElement('div')
  text.className = 'onboarding-progress-text'
  text.innerHTML = `
    <span class="onboarding-progress-count">${progress.completed}/${progress.total}</span>
    <span class="onboarding-progress-percentage">${progress.percentage}%</span>
  `
  return text
}

const createOnboardingContainer = () => {
  const container = document.createElement('div')
  container.className = 'onboarding-container'
  container.id = 'onboarding-root'
  container.setAttribute('role', 'dialog')
  container.setAttribute('aria-label', 'Onboarding Nexora')
  container.setAttribute('aria-modal', 'true')
  return container
}

export async function renderOnboarding() {
  const shouldShow = await OnboardingService.shouldShowOnboarding()
  if (!shouldShow) return null
  
  const state = await OnboardingService.getState()
  const progress = await OnboardingService.getProgress()
  
  const container = createOnboardingContainer()
  
  const card = document.createElement('div')
  card.className = 'onboarding-card'
  
  const welcomeCard = createWelcomeCard()
  card.appendChild(welcomeCard)
  
  const progressSection = document.createElement('div')
  progressSection.className = 'onboarding-progress-section'
  
  const progressBar = createProgressBar(progress)
  const progressText = createProgressText(progress)
  
  progressSection.appendChild(progressBar)
  progressSection.appendChild(progressText)
  card.appendChild(progressSection)
  
  const checklist = document.createElement('div')
  checklist.className = 'onboarding-checklist'
  checklist.setAttribute('role', 'list')
  checklist.setAttribute('aria-label', 'Étapes de l\'onboarding')
  
  state.steps.forEach((step, index) => {
    const isCurrent = index === state.currentStep
    const item = createChecklistItem(step, index, isCurrent)
    checklist.appendChild(item)
  })
  
  card.appendChild(checklist)
  
  const dismissBtn = document.createElement('button')
  dismissBtn.className = 'onboarding-dismiss-btn'
  dismissBtn.setAttribute('aria-label', 'Masquer l\'onboarding')
  dismissBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `
  dismissBtn.addEventListener('click', async () => {
    await OnboardingService.dismiss()
    animateOnboardingExit(container)
  })
  card.appendChild(dismissBtn)
  
  welcomeCard.querySelector('.onboarding-start-btn').addEventListener('click', async () => {
    await OnboardingService.start()
    welcomeCard.style.display = 'none'
  })
  
  container.appendChild(card)
  
  // Focus trap and Escape key handling
  setupAccessibility(container, card)
  
  // Animate entry using Motion V1
  animateOnboardingEntry(card)
  
  return container
}

function animateOnboardingEntry(card) {
  if (typeof window !== 'undefined' && window.NexoraMotion) {
    window.NexoraMotion.animateCards?.(card)
  }
}

function animateOnboardingExit(container) {
  if (typeof window !== 'undefined' && window.NexoraMotion) {
    // Use GSAP directly for exit animation since it's a modal close
    const gsap = window.gsap
    if (gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.to(container, {
        opacity: 0,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => container.remove()
      })
    } else {
      container.remove()
    }
  } else {
    container.remove()
  }
}

function setupAccessibility(container, card) {
  const focusableElements = card.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]
  
  // Focus first element when modal opens
  setTimeout(() => firstFocusable?.focus(), 100)
  
  // Trap focus within modal
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }
    
    // Escape key to close
    if (e.key === 'Escape') {
      e.preventDefault()
      OnboardingService.dismiss().then(() => container.remove())
    }
  })
}

export async function updateOnboardingStep(stepId) {
  const container = document.getElementById('onboarding-root')
  if (!container) return
  
  await OnboardingService.completeStep(stepId)
  
  const state = await OnboardingService.getState()
  const progress = await OnboardingService.getProgress()
  
  const progressBar = container.querySelector('.onboarding-progress-fill')
  if (progressBar) {
    progressBar.style.width = `${progress.percentage}%`
  }
  
  const progressText = container.querySelector('.onboarding-progress-text')
  if (progressText) {
    progressText.innerHTML = `
      <span class="onboarding-progress-count">${progress.completed}/${progress.total}</span>
      <span class="onboarding-progress-percentage">${progress.percentage}%</span>
    `
  }
  
  const stepItem = container.querySelector(`[data-step-id="${stepId}"]`)
  if (stepItem) {
    stepItem.classList.add('completed')
    const checkbox = stepItem.querySelector('.onboarding-checkbox')
    if (checkbox) {
      checkbox.innerHTML = '✓'
      checkbox.setAttribute('aria-checked', 'true')
    }
  }
  
  if (state.completed) {
    setTimeout(() => {
      container.remove()
    }, 1500)
  }
}

export async function dismissOnboarding() {
  const container = document.getElementById('onboarding-root')
  if (container) {
    container.remove()
  }
  await OnboardingService.dismiss()
}

export default {
  renderOnboarding,
  updateOnboardingStep,
  dismissOnboarding
}
