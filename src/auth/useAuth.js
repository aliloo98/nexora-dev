/**
 * Nexora - useAuth Hook
 *
 * Custom hook for accessing auth state and functions in components.
 * Simplifies interaction with AuthContext.
 *
 * TODO: Update when migrating to real Supabase
 */

import AuthContext from './authContext.js'

/**
 * useAuth Hook - Similar to React's useAuth pattern
 *
 * Usage in components:
 * const auth = useAuth()
 *
 * Properties:
 * - user: Current user object or null
 * - isAuthenticated: Boolean flag
 * - isLoading: Boolean flag (during async operations)
 * - error: Current error or null
 * - signIn(email, password): Sign in user
 * - signUp(email, password, username): Sign up user
 * - signOut(): Sign out user
 * - displayName: User's display name
 *
 * Example:
 * const { user, isAuthenticated, signOut } = useAuth()
 * if (isAuthenticated) {
 *   console.log('User:', user.email)
 * }
 */
export const useAuth = () => {
  const state = AuthContext.getState()

  return {
    // State
    user: state.user,
    session: state.session,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,

    // Display name for UI
    displayName: AuthContext.getUserDisplayName(),

    // Methods
    signIn: (email, password) => AuthContext.signIn(email, password),
    signUp: (email, password, username) => AuthContext.signUp(email, password, username),
    signOut: () => AuthContext.signOut(),

    // Helpers
    getCurrentUser: () => AuthContext.getCurrentUser(),
    getCurrentSession: () => AuthContext.getCurrentSession()
  }
}

export default useAuth
