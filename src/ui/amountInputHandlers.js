/**
 * Amount Input Handlers
 *
 * Attaches validation and formatting handlers to amount input fields.
 * Prevents invalid input, supports French number formats, and provides
 * user feedback through toast messages and visual indicators.
 *
 * @param {Object} dependencies
 * @param {Object} dependencies.documentRef - Document reference
 * @param {Function} dependencies.parseFinancialExpression - Function to parse financial expressions
 * @param {Function} dependencies.formatCurrency - Function to format currency values
 * @param {Function} dependencies.showToast - Function to show toast messages
 * @param {Object} dependencies.clipboardDataRef - Clipboard data reference (window.clipboardData fallback)
 * @returns {Function} Function to attach handlers (can be called for re-attachment)
 */
export function createAmountInputHandlers({
  documentRef = document,
  parseFinancialExpression,
  formatCurrency,
  showToast,
  clipboardDataRef
}) {
  /**
   * Sanitize input value
   * @param {string} v - Raw input value
   * @returns {string} Sanitized value
   */
  const sanitize = (v) => String(v ?? '')
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\,+/g, ',')
    .trim()

  /**
   * Check if an input element should have amount handlers attached
   * @param {HTMLInputElement} input - Input element
   * @returns {boolean}
   */
  const isAmountInput = (input) => {
    if (!input || input.classList.contains('note-input')) return false
    if (input.type === 'date' || input.type === 'color') return false
    if (input.dataset?.key) return true
    if (input.type === 'number') return true
    if (input.classList.contains('plan-goal-input')) return true
    if (input.classList.contains('plan-debt-input')) return true
    if (input.classList.contains('plan-debt-payment')) return true
    if (input.classList.contains('recurring-income-input') && input.dataset?.key === 'amount') return true
    if (input.classList.contains('bill-schedule-input') && input.dataset?.key === 'amount') return true
    return [
      'goal-monthly-contrib',
      'goal-new-target',
      'goal-new-current',
      'notification-expense-threshold',
      'budget-cycle-start-day',
      'budget-cycle-end-day'
    ].includes(input.id)
  }

  /**
   * Attach handlers to all amount inputs
   */
  const attachAmountInputHandlers = () => {
    const inputs = documentRef.querySelectorAll('.budget-input')
    inputs.forEach(input => {
      if (!isAmountInput(input)) return
      if (input.__amountHandlerAttached) return
      input.__amountHandlerAttached = true

      input.addEventListener('focus', () => {
        const raw = sanitize(input.value)
        if (raw && parseFinancialExpression(raw, { fallback: null }) !== null) {
          input.dataset.lastValidValue = input.value
        }
      })

      input.addEventListener('input', () => {
        const raw = sanitize(input.value)
        const parsed = parseFinancialExpression(raw, { fallback: null })
        if (raw && parsed === null) {
          input.classList.add('input-error')
        } else {
          input.classList.remove('input-error')
        }
      })

      input.addEventListener('paste', (e) => {
        e.preventDefault()
        const text = (e.clipboardData || clipboardDataRef).getData('text') || ''
        const cleaned = sanitize(text)
        documentRef.execCommand('insertText', false, cleaned)
      })

      input.addEventListener('blur', () => {
        const raw = sanitize(input.value)
        if (!raw) {
          input.classList.remove('input-error')
          return
        }
        const numeric = parseFinancialExpression(raw, { fallback: null })
        if (numeric === null) {
          input.classList.add('input-error')
          showToast?.('Expression financière invalide : rien n\'a été enregistré')
          if (Object.prototype.hasOwnProperty.call(input.dataset, 'lastValidValue')) {
            input.value = input.dataset.lastValidValue
          }
          return
        }
        input.classList.remove('input-error')
        const formatted = typeof formatCurrency === 'function'
          ? formatCurrency(numeric)
          : String(numeric)
        input.value = formatted
        input.dataset.lastValidValue = formatted
      })
    })
  }

  return attachAmountInputHandlers
}
