/**
 * Nexora - Auth Error Normalization
 *
 * Centralized error translation for Supabase Auth errors.
 * Provides user-friendly French messages for common auth scenarios.
 *
 * Security: Never exposes sensitive data in error messages.
 */

/**
 * Normalize Supabase Auth errors to user-friendly French messages
 * @param {Error} error - The original error from Supabase Auth
 * @returns {string} User-friendly French error message
 */
export const normalizeAuthError = (error) => {
  if (!error) {
    return 'Une erreur est survenue. Réessayez.'
  }

  const errorMessage = error.message || String(error)
  const errorLower = errorMessage.toLowerCase()

  // Email not confirmed
  if (errorLower.includes('email not confirmed') || 
      errorLower.includes('email_not_confirmed') ||
      errorLower.includes('email confirmation')) {
    return 'Votre adresse e-mail doit être confirmée. Vérifiez votre boîte de réception et cliquez sur le lien de confirmation.'
  }

  // Invalid credentials
  if (errorLower.includes('invalid credentials') ||
      errorLower.includes('invalid_login_credentials') ||
      errorLower.includes('invalid login credentials')) {
    return 'Adresse e-mail ou mot de passe incorrect.'
  }

  // User already exists
  if (errorLower.includes('user already exists') ||
      errorLower.includes('user_already_exists') ||
      errorLower.includes('duplicate') ||
      errorLower.includes('already registered')) {
    return 'Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou utilisez une autre adresse.'
  }

  // Rate limit / too many requests
  if (errorLower.includes('over_email_send_rate_limit') ||
      errorLower.includes('rate limit') ||
      errorLower.includes('too many requests') ||
      errorLower.includes('429')) {
    return 'Trop de demandes. Attendez quelques minutes avant de réessayer.'
  }

  // Signup disabled
  if (errorLower.includes('signup disabled') ||
      errorLower.includes('signups not allowed') ||
      errorLower.includes('signup_not_allowed')) {
    return 'L\'inscription est temporairement indisponible. Réessayez plus tard.'
  }

  // Weak password
  if (errorLower.includes('weak password') ||
      errorLower.includes('password should be') ||
      errorLower.includes('password too short')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.'
  }

  // Network errors
  if (errorLower.includes('network') ||
      errorLower.includes('fetch') ||
      errorLower.includes('connection') ||
      errorLower.includes('timeout')) {
    return 'Problème de connexion. Vérifiez votre internet et réessayez.'
  }

  // Email validation
  if (errorLower.includes('invalid email') ||
      errorLower.includes('email format')) {
    return 'Adresse e-mail invalide.'
  }

  // Generic auth errors (safe fallback)
  if (errorLower.includes('auth') ||
      errorLower.includes('unauthorized') ||
      errorLower.includes('forbidden')) {
    return 'Erreur d\'authentification. Vérifiez vos identifiants et réessayez.'
  }

  // Safe fallback for unknown errors
  return 'Une erreur est survenue. Réessayez.'
}

/**
 * Get error type for UI handling
 * @param {Error} error - The original error
 * @returns {string} Error type key
 */
export const getAuthErrorType = (error) => {
  if (!error) return 'UNKNOWN'

  const errorMessage = error.message || String(error)
  const errorLower = errorMessage.toLowerCase()

  if (errorLower.includes('email not confirmed') || errorLower.includes('email_not_confirmed')) {
    return 'EMAIL_NOT_CONFIRMED'
  }
  if (errorLower.includes('invalid credentials') || errorLower.includes('invalid_login_credentials')) {
    return 'INVALID_CREDENTIALS'
  }
  if (errorLower.includes('user already exists') || errorLower.includes('user_already_exists')) {
    return 'USER_ALREADY_EXISTS'
  }
  if (errorLower.includes('over_email_send_rate_limit') || errorLower.includes('429')) {
    return 'RATE_LIMIT'
  }
  if (errorLower.includes('signup disabled') || errorLower.includes('signups not allowed')) {
    return 'SIGNUP_DISABLED'
  }
  if (errorLower.includes('weak password')) {
    return 'WEAK_PASSWORD'
  }
  if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('connection')) {
    return 'NETWORK_ERROR'
  }

  return 'UNKNOWN'
}

/**
 * Check if error is recoverable (can be retried by user)
 * @param {string} errorType - Error type from getAuthErrorType
 * @returns {boolean} Whether error is recoverable
 */
export const isRecoverableAuthError = (errorType) => {
  const recoverableErrors = ['NETWORK_ERROR', 'RATE_LIMIT']
  return recoverableErrors.includes(errorType)
}

/**
 * Check if error allows resend confirmation
 * @param {string} errorType - Error type from getAuthErrorType
 * @returns {boolean} Whether resend is available
 */
export const allowsResendConfirmation = (errorType) => {
  return errorType === 'EMAIL_NOT_CONFIRMED'
}

export default {
  normalizeAuthError,
  getAuthErrorType,
  isRecoverableAuthError,
  allowsResendConfirmation
}
