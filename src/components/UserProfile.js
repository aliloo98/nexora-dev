/**
 * Nexora - User Profile Header Component
 * 
 * Displays user's username in the header and provides logout functionality.
 * Replaces static "Ali & Megane" with dynamic username.
 * 
 * TODO: Integrate with dashboard header system
 * TODO: Add profile settings page
 */

import AuthContext from '../auth/authContext.js'
import AuthPages from '../pages/AuthPages.js'

/**
 * Update Header with User Info
 * Called after login or on app initialization
 */
export const updateUserHeader = () => {
  const headerTitle = document.querySelector('.header h1')
  if (!headerTitle) return

  const user = AuthContext.getCurrentUser()
  const displayName = AuthContext.getUserDisplayName()

  if (user) {
    // User is logged in - show greeting with username
    headerTitle.innerHTML = `Bonjour <span style="color: var(--accent); font-weight: 700;">${displayName}</span> 👋`
    console.log('✅ Header updated with username:', displayName)
  } else {
    // No user - show default
    headerTitle.innerHTML = 'Budget <span>Ali & Megane</span>'
    console.log('ℹ️  Header showing default title')
  }
}

/**
 * Create User Menu Component
 * Returns HTML for user profile menu in header
 */
export const createUserMenu = () => {
  const user = AuthContext.getCurrentUser()
  const displayName = AuthContext.getUserDisplayName()

  if (!user) {
    return ''
  }

  return `
    <div class="user-menu" id="userMenu">
      <button class="user-menu-btn" id="userMenuBtn" title="Menu utilisateur">
        <span class="user-avatar">${displayName.charAt(0).toUpperCase()}</span>
        <span class="user-name">${displayName}</span>
        <span class="user-menu-dropdown">▾</span>
      </button>
      <div class="user-menu-dropdown-content" id="userMenuDropdown" style="display: none;">
        <div class="user-menu-profile">
          <div class="user-avatar-large">${displayName.charAt(0).toUpperCase()}</div>
          <div class="user-profile-info">
            <div class="user-profile-name">${displayName}</div>
            <div class="user-profile-email">${user.email}</div>
          </div>
        </div>
        <div class="user-menu-separator"></div>
        <button class="user-menu-item" id="logoutBtn">
          🚪 Déconnexion
        </button>
      </div>
    </div>
  `
}

/**
 * Attach User Menu Listeners
 */
export const attachUserMenuListeners = () => {
  const userMenuBtn = document.getElementById('userMenuBtn')
  const userMenuDropdown = document.getElementById('userMenuDropdown')
  const logoutBtn = document.getElementById('logoutBtn')

  if (!userMenuBtn || !userMenuDropdown) return

  // Toggle dropdown
  userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    userMenuDropdown.style.display = 
      userMenuDropdown.style.display === 'none' ? 'block' : 'none'
  })

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      userMenuDropdown.style.display = 'none'
    }
  })

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault()
      
      console.log('🔐 Logout initiated by user')
      
      // Show confirmation
      window.customConfirm(
        'Déconnexion',
        'Êtes-vous sûr de vouloir vous déconnecter?',
        async () => {
          try {
            // Call logout
            const { error } = await AuthContext.signOut()
            
            if (error) {
              window.showToast('❌ Erreur de déconnexion')
              return
            }

            window.showToast('✅ Vous avez été déconnecté')
            console.log('✅ User logged out successfully')
            
            // Redirect to login
            setTimeout(() => {
              AuthPages.showAuthPages()
              AuthPages.showLoginPage()
            }, 800)
          } catch (error) {
            console.error('Logout error:', error)
            window.showToast('❌ Erreur')
          }
        }
      )
    })
  }
}

/**
 * Listen to auth state changes
 * Updates UI when user logs in/out
 */
export const setupAuthStateListener = () => {
  console.log('🔐 Setting up auth state listener')
  
  // Subscribe to auth context changes
  const unsubscribe = AuthContext.subscribe((newState) => {
    console.log('📊 Auth state changed:', newState)
    
    if (newState.isAuthenticated && newState.user) {
      // User logged in
      console.log('✅ User authenticated:', newState.user.email)
      updateUserHeader()
      
      // Update user menu if it exists
      const userMenu = document.getElementById('userMenu')
      if (userMenu) {
        userMenu.innerHTML = createUserMenu()
        attachUserMenuListeners()
      }
    } else {
      // User logged out
      console.log('❌ User not authenticated')
      updateUserHeader()
    }
  })

  return unsubscribe
}

export default {
  updateUserHeader,
  createUserMenu,
  attachUserMenuListeners,
  setupAuthStateListener
}
