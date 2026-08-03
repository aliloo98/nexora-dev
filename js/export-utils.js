const normalizeLabel = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export const buildBudgetExportFilename = (monthLabel, extension) => {
  const safeExtension = String(extension || '').replace(/^\.+/, '').toLowerCase() || 'bin'
  const slug = normalizeLabel(monthLabel)
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'mois'
  return `nexora-budget-${slug}.${safeExtension}`
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default { buildBudgetExportFilename, downloadBlob }
