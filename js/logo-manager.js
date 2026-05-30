const OFFICIAL_LOGO = '/icon-192.png'

const LogoManager = (() => {
  const init = async () => {
    updateAppLogo()
  }

  const updateAppLogo = () => {
    const sidebarLogo = document.getElementById('app-sidebar-logo')
    if (!sidebarLogo) return
    sidebarLogo.innerHTML = `<img src="${OFFICIAL_LOGO}" alt="NEXORA">`
  }

  return {
    init,
    LOGO_PRESETS: [],
    selectPresetLogo: init,
    setCustomEmojiLogo: init,
    uploadLogoImage: init,
    resetAppLogo: init,
    updateAppLogo,
    renderLogoOptions: init
  }
})()

export { LogoManager }
