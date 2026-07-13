const HTML_ESCAPE_CHARACTERS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, character => HTML_ESCAPE_CHARACTERS[character])

export default escapeHtml
