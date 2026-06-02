/**
 * Nexora - Couple UI Component
 *
 * Renders the couple tab in navigation:
 * - Only show if couple is active
 * - Display: ❤️ Couple
 * - Routes to couple budget view
 */

import { CoupleInvitationService } from './coupleInvitationService.js'

export const CoupleUIComponent = {
  /**
   * Determine if couple tab should be visible
   * @param {Object} user - Authenticated user object or couple object
   * @returns {Promise<boolean>}
   */
  async shouldShowCoupleTab(user) {
    if (!user) {
      return false
    }

    // Backward compatibility for couple object checks
    if (user.status) {
      return user.status === 'active'
    }

    if (!user.id) {
      return false
    }

    try {
      const coupleStatus = await CoupleInvitationService.getCoupleStatus(user.id)
      return coupleStatus?.status === 'couple_actif' && coupleStatus.details?.couple?.status === 'active'
    } catch (error) {
      console.warn('⚠️ Couple status load failed:', error)
      return false
    }
  },

  /**
   * Render couple navigation item
   * @param {Object} couple - Couple data
   * @returns {string} HTML for navigation item
   */
  renderCoupleNavItem(couple) {
    if (!couple || couple.status !== 'active') {
      return ''
    }

    return `
      <a href="/couple" class="nav-item couple-nav-item" data-testid="couple-nav">
        <span class="emoji">❤️</span>
        <span class="label">Couple</span>
      </a>
    `
  },

  /**
   * Build couple page header
   * @param {Array} unreadNotifications - Unread notification count
   * @returns {string} HTML header
   */
  renderCoupleHeader(unreadNotifications = 0) {
    let badgeHtml = ''
    if (unreadNotifications > 0) {
      badgeHtml = `<span class="notification-badge">${unreadNotifications}</span>`
    }

    return `
      <div class="couple-header">
        <div class="header-title">
          <span class="emoji">❤️</span>
          <h1>Budget Foyer</h1>
          ${badgeHtml}
        </div>
        <p class="subtitle">Vue partagée avec votre partenaire</p>
      </div>
    `
  },

  /**
   * Render couple budget section
   * @param {Object} budget - Budget data
   * @returns {string} HTML
   */
  renderBudgetSection(budget) {
    if (!budget) {
      return '<p>Chargement du budget...</p>'
    }

    const user1Name = 'Membre 1'
    const user2Name = 'Membre 2'

    return `
      <div class="couple-budget-section">
        <div class="budget-cards">
          <div class="card income-card">
            <div class="label">Revenus communs</div>
            <div class="amount">€${Math.round(budget.common_income)}</div>
          </div>
          
          <div class="card expense-card">
            <div class="label">Charges communes</div>
            <div class="amount">€${Math.round(budget.common_expenses)}</div>
          </div>
          
          <div class="card remaining-card ${budget.remaining < 0 ? 'negative' : 'positive'}">
            <div class="label">Reste à vivre</div>
            <div class="amount">€${Math.round(budget.remaining)}</div>
          </div>
        </div>

        <div class="contributions">
          <div class="contribution-bar">
            <div class="label">Contributions</div>
            <div class="bar-container">
              <div class="bar-segment" style="width: ${budget.user1_contribution_pct}%" title="${user1Name}">
                <span>${Math.round(budget.user1_contribution_pct)}%</span>
              </div>
              <div class="bar-segment" style="width: ${budget.user2_contribution_pct}%" title="${user2Name}">
                <span>${Math.round(budget.user2_contribution_pct)}%</span>
              </div>
            </div>
            <div class="contribution-labels">
              <div>${user1Name}: €${Math.round(budget.user1_income)}</div>
              <div>${user2Name}: €${Math.round(budget.user2_income)}</div>
            </div>
          </div>
        </div>
      </div>
    `
  },

  /**
   * Render couple mode toggle
   * @param {boolean} isEnabled - Is couple mode enabled
   * @returns {string} HTML
   */
  renderCoupeModeToggle(isEnabled) {
    const checkedAttr = isEnabled ? 'checked' : ''
    return `
      <div class="couple-mode-toggle">
        <label>
          <input type="checkbox" id="couple-mode-toggle" ${checkedAttr} />
          <span>Afficher le mode couple</span>
        </label>
      </div>
    `
  },

  /**
   * Render share settings
   * @returns {string} HTML
   */
  renderShareSettings() {
    return `
      <div class="share-settings">
        <h3>Partage sélectif</h3>
        <p>Choisissez ce que vous souhaitez partager avec votre partenaire:</p>
        
        <div class="sharing-options">
          <label class="share-option">
            <input type="checkbox" name="share" value="transactions" checked />
            <span>💳 Transactions</span>
          </label>
          
          <label class="share-option">
            <input type="checkbox" name="share" value="goals" checked />
            <span>🎯 Objectifs</span>
          </label>
          
          <label class="share-option">
            <input type="checkbox" name="share" value="debts" checked />
            <span>📊 Dettes</span>
          </label>
        </div>
      </div>
    `
  },

  /**
   * Render couple settings
   * @returns {string} HTML
   */
  renderCoupleSettings() {
    return `
      <div class="couple-settings-page">
        <h2>Paramètres du foyer</h2>
        
        <section class="setting-section">
          <h3>Partage sélectif</h3>
          ${this.renderShareSettings()}
        </section>

        <section class="setting-section">
          <h3>Quitter le foyer</h3>
          <p>Dissoudre le lien de couple et arrêter le partage.</p>
          <button id="dissolve-couple-btn" class="btn btn-danger">Dissoudre le foyer</button>
        </section>
      </div>
    `
  },

  /**
   * Get CSS for couple mode
   * @returns {string} CSS
   */
  getCoupleCSS() {
    return `
      .couple-nav-item {
        color: #e75480;
      }

      .couple-header {
        background: linear-gradient(135deg, #e75480 0%, #f2a0b8 100%);
        color: white;
        padding: 2rem;
        border-radius: 8px;
        margin-bottom: 2rem;
      }

      .budget-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        margin-bottom: 2rem;
      }

      .card {
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1.5rem;
        text-align: center;
      }

      .card.positive {
        border-left: 4px solid #10b981;
      }

      .card.negative {
        border-left: 4px solid #ef4444;
        background: #fef2f2;
      }

      .bar-segment {
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 0.75rem;
        font-weight: bold;
      }

      .notification-badge {
        background: #ef4444;
        color: white;
        border-radius: 50%;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        margin-left: 0.5rem;
      }

      @media (max-width: 768px) {
        .budget-cards {
          grid-template-columns: 1fr;
        }
      }
    `
  }
}

export default CoupleUIComponent
