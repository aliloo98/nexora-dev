import { OnboardingStorage } from './onboardingStorage.js'

export const OnboardingService = {
  /**
   * Vérifie si l'onboarding doit être affiché
   */
  async shouldShowOnboarding() {
    const state = await OnboardingStorage.loadState()
    
    // Ne pas afficher si déjà terminé
    if (state.completed) return false
    
    // Ne pas afficher si explicitement masqué
    if (state.dismissed) return false
    
    // Afficher si jamais démarré
    if (!state.startedAt) return true
    
    // Afficher si en cours
    return true
  },

  /**
   * Démarre l'onboarding
   */
  async start() {
    return await OnboardingStorage.start()
  },

  /**
   * Marque une étape comme complétée
   */
  async completeStep(stepId) {
    return await OnboardingStorage.completeStep(stepId)
  },

  /**
   * Masque l'onboarding temporairement
   */
  async dismiss() {
    return await OnboardingStorage.dismiss()
  },

  /**
   * Relance complètement l'onboarding
   */
  async reset() {
    return await OnboardingStorage.reset()
  },

  /**
   * Récupère l'état actuel
   */
  async getState() {
    return await OnboardingStorage.loadState()
  },

  /**
   * Calcule la progression (0-100)
   */
  async getProgress() {
    const state = await OnboardingStorage.loadState()
    const totalSteps = state.steps.length
    const completedSteps = state.steps.filter(s => s.completed).length
    
    return {
      completed: completedSteps,
      total: totalSteps,
      percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
    }
  },

  /**
   * Vérifie si une étape spécifique est complétée
   */
  async isStepCompleted(stepId) {
    const state = await OnboardingStorage.loadState()
    const step = state.steps.find(s => s.id === stepId)
    return step ? step.completed : false
  }
}
