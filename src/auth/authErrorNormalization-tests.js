/**
 * Nexora - Auth Error Normalization Tests
 *
 * Tests for centralized auth error translation and user-friendly messaging
 */

import { normalizeAuthError, getAuthErrorType, isRecoverableAuthError, allowsResendConfirmation } from './authErrorNormalization.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

// normalizeAuthError tests
assert(
  normalizeAuthError(new Error('Email not confirmed')) === 'Votre adresse e-mail doit être confirmée. Vérifiez votre boîte de réception et cliquez sur le lien de confirmation.',
  'email not confirmed normalization'
)

assert(
  normalizeAuthError(new Error('Invalid login credentials: Email not found')) === 'Adresse e-mail ou mot de passe incorrect.',
  'invalid credentials normalization'
)

assert(
  normalizeAuthError(new Error('User already exists: user_already_exists')) === 'Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou utilisez une autre adresse.',
  'user already exists normalization'
)

assert(
  normalizeAuthError(new Error('Over email send rate limit')) === 'Trop de demandes. Attendez quelques minutes avant de réessayer.',
  'rate limit normalization'
)

assert(
  normalizeAuthError(new Error('429')) === 'Trop de demandes. Attendez quelques minutes avant de réessayer.',
  '429 status code normalization'
)

assert(
  normalizeAuthError(new Error('Signups not allowed')) === 'L\'inscription est temporairement indisponible. Réessayez plus tard.',
  'signup disabled normalization'
)

assert(
  normalizeAuthError(new Error('Password should be at least 6 characters')) === 'Le mot de passe doit contenir au moins 6 caractères.',
  'weak password normalization'
)

assert(
  normalizeAuthError(new Error('Failed to fetch')) === 'Problème de connexion. Vérifiez votre internet et réessayez.',
  'network error normalization'
)

assert(
  normalizeAuthError(new Error('Some unknown error')) === 'Une erreur est survenue. Réessayez.',
  'unknown error normalization'
)

assert(
  normalizeAuthError(null) === 'Une erreur est survenue. Réessayez.',
  'null error normalization'
)

assert(
  normalizeAuthError({ message: '' }) === 'Une erreur est survenue. Réessayez.',
  'empty error message normalization'
)

// getAuthErrorType tests
assert(
  getAuthErrorType(new Error('Email not confirmed')) === 'EMAIL_NOT_CONFIRMED',
  'email not confirmed type'
)

assert(
  getAuthErrorType(new Error('invalid credentials')) === 'INVALID_CREDENTIALS',
  'invalid credentials type'
)

assert(
  getAuthErrorType(new Error('User already exists')) === 'USER_ALREADY_EXISTS',
  'user already exists type'
)

assert(
  getAuthErrorType(new Error('over_email_send_rate_limit')) === 'RATE_LIMIT',
  'rate limit type'
)

assert(
  getAuthErrorType(new Error('429')) === 'RATE_LIMIT',
  '429 status code type'
)

assert(
  getAuthErrorType(new Error('Signup disabled')) === 'SIGNUP_DISABLED',
  'signup disabled type'
)

assert(
  getAuthErrorType(new Error('Weak password')) === 'WEAK_PASSWORD',
  'weak password type'
)

assert(
  getAuthErrorType(new Error('Network request failed')) === 'NETWORK_ERROR',
  'network error type'
)

assert(
  getAuthErrorType(new Error('Some random error')) === 'UNKNOWN',
  'unknown error type'
)

assert(
  getAuthErrorType(null) === 'UNKNOWN',
  'null error type'
)

// isRecoverableAuthError tests
assert(
  isRecoverableAuthError('NETWORK_ERROR') === true,
  'network error is recoverable'
)

assert(
  isRecoverableAuthError('RATE_LIMIT') === true,
  'rate limit is recoverable'
)

assert(
  isRecoverableAuthError('INVALID_CREDENTIALS') === false,
  'invalid credentials is not recoverable'
)

assert(
  isRecoverableAuthError('EMAIL_NOT_CONFIRMED') === false,
  'email not confirmed is not recoverable'
)

assert(
  isRecoverableAuthError('USER_ALREADY_EXISTS') === false,
  'user already exists is not recoverable'
)

assert(
  isRecoverableAuthError('UNKNOWN') === false,
  'unknown is not recoverable'
)

// allowsResendConfirmation tests
assert(
  allowsResendConfirmation('EMAIL_NOT_CONFIRMED') === true,
  'email not confirmed allows resend'
)

assert(
  allowsResendConfirmation('INVALID_CREDENTIALS') === false,
  'invalid credentials does not allow resend'
)

assert(
  allowsResendConfirmation('RATE_LIMIT') === false,
  'rate limit does not allow resend'
)

assert(
  allowsResendConfirmation('NETWORK_ERROR') === false,
  'network error does not allow resend'
)

assert(
  allowsResendConfirmation('UNKNOWN') === false,
  'unknown does not allow resend'
)

// Additional tests for resend button behavior
assert(
  normalizeAuthError(new Error('Too many requests')) === 'Trop de demandes. Attendez quelques minutes avant de réessayer.',
  'too many requests normalization'
)

console.log('authErrorNormalization-tests: OK')
