import { UserAppSettingsService } from '../../js/userAppSettingsService.js'

const ONBOARDING_STATE_KEY = 'nexora_onboarding_state_v1'

const nowIso = () => new Date().toISOString()

export const OnboardingStorage = {
  /**
   * Charge l'état complet de l'onboarding
   */
  async loadState() {
    try {
      const { value } = await UserAppSettingsService.getSetting(ONBOARDING_STATE_KEY)
      const storageKey = UserAppSettingsService.getLocalStorageKey(ONBOARDING_STATE_KEY)
      const raw = value === null ? localStorage.getItem(storageKey) : null
      const parsed = value !== null ? value : (raw ? JSON.parse(raw) : null)
      
      if (!parsed) {
        return this.getInitialState()
      }
      
      return {
        completed: parsed.completed || false,
        startedAt: parsed.startedAt || null,
        completedAt: parsed.completedAt || null,
        currentStep: parsed.currentStep || 0,
        steps: parsed.steps || this.getDefaultSteps(),
        dismissed: parsed.dismissed || false
      }
    } catch (error) {
      console.warn('[OnboardingStorage] failed to load state', error)
      return this.getInitialState()
    }
  },

  /**
   * Sauvegarde l'état de l'onboarding
   */
  async saveState(state) {
    try {
      const toSave = {
        completed: state.completed,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
        currentStep: state.currentStep,
        steps: state.steps,
        dismissed: state.dismissed
      }
      
      await UserAppSettingsService.saveSetting(ONBOARDING_STATE_KEY, toSave)
      await UserAppSettingsService.syncLocalSettingToCloud(ONBOARDING_STATE_KEY).catch((err) => {
        console.warn('[OnboardingStorage] cloud sync failed', err)
      })
      
      return toSave
    } catch (error) {
      console.warn('[OnboardingStorage] failed to save state', error)
      return null
    }
  },

  /**
   * Marque une étape comme complétée
   */
  async completeStep(stepId) {
    const state = await this.loadState()
    const stepIndex = state.steps.findIndex(s => s.id === stepId)
    
    if (stepIndex === -1) return state
    
    state.steps[stepIndex].completed = true
    state.steps[stepIndex].completedAt = nowIso()
    
    // Avance à l'étape suivante si nécessaire
    if (state.currentStep === stepIndex) {
      const nextStep = state.steps.findIndex((s, i) => i > stepIndex && !s.completed)
      state.currentStep = nextStep === -1 ? state.steps.length : nextStep
    }
    
    // Vérifie si toutes les étapes sont complétées
    const allCompleted = state.steps.every(s => s.completed)
    if (allCompleted && !state.completed) {
      state.completed = true
      state.completedAt = nowIso()
    }
    
    return this.saveState(state)
  },

  /**
   * Démarre l'onboarding
   */
  async start() {
    const state = await this.loadState()
    if (state.startedAt) return state
    
    state.startedAt = nowIso()
    state.currentStep = 0
    state.dismissed = false
    
    return this.saveState(state)
  },

  /**
   * Masque l'onboarding (sans le marquer comme terminé)
   */
  async dismiss() {
    const state = await this.loadState()
    state.dismissed = true
    return this.saveState(state)
  },

  /**
   * Relance l'onboarding (reset complet)
   */
  async reset() {
    const initialState = this.getInitialState()
    initialState.startedAt = nowIso()
    return this.saveState(initialState)
  },

  /**
   * État initial par défaut
   */
  getInitialState() {
    return {
      completed: false,
      startedAt: null,
      completedAt: null,
      currentStep: 0,
      steps: this.getDefaultSteps(),
      dismissed: false
    }
  },

  /**
   * Étapes par défaut de l'onboarding
   */
  getDefaultSteps() {
    return [
      {
        id: 'create_budget',
        title: 'Créer son budget',
        description: 'Configurez votre budget mensuel',
        completed: false,
        completedAt: null
      },
      {
        id: 'add_income',
        title: 'Ajouter un revenu',
        description: 'Enregistrez vos revenus mensuels',
        completed: false,
        completedAt: null
      },
      {
        id: 'add_expense',
        title: 'Ajouter une dépense',
        description: 'Saisissez vos dépenses courantes',
        completed: false,
        completedAt: null
      },
      {
        id: 'view_dashboard',
        title: 'Consulter le Dashboard',
        description: 'Découvrez votre vue d\'ensemble',
        completed: false,
        completedAt: null
      },
      {
        id: 'finish',
        title: 'Terminer',
        description: 'Profitez de Nexora',
        completed: false,
        completedAt: null
      }
    ]
  }
}
