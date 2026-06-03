export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : ''

export const formatBuildLabel = () => {
  if (!BUILD_TIME) return APP_VERSION
  const date = new Date(BUILD_TIME)
  if (Number.isNaN(date.getTime())) return APP_VERSION
  return `${APP_VERSION} · ${date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
}

export default { APP_VERSION, BUILD_TIME, formatBuildLabel }
