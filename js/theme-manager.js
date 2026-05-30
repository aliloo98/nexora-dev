import { STORAGE_KEYS } from '../src/constants/storageKeys.js'

// Theme Management System
const ThemeManager = (() => {
  const THEMES = {
    gold: {
      accent: '#d4af37',
      accent2: '#f3e5ab',
      gradient: 'linear-gradient(135deg, #e5c060 0%, #b89130 50%, #906d18 100%)',
      glow: 'rgba(229, 192, 96, 0.15)',
      bgGradient: 'radial-gradient(circle at top right, #121225 0%, #07070d 60%, #030306 100%)'
    },
    emerald: {
      accent: '#10b981',
      accent2: '#a7f3d0',
      gradient: 'linear-gradient(135deg, #34d399 0%, #059669 50%, #047857 100%)',
      glow: 'rgba(16, 185, 129, 0.15)',
      bgGradient: 'radial-gradient(circle at top right, #062016 0%, #030a07 60%, #010403 100%)'
    },
    amethyst: {
      accent: '#8b5cf6',
      accent2: '#ddd6fe',
      gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #5b21b6 100%)',
      glow: 'rgba(139, 92, 246, 0.15)',
      bgGradient: 'radial-gradient(circle at top right, #251230 0%, #0a070f 60%, #040306 100%)'
    },
    ruby: {
      accent: '#f43f5e',
      accent2: '#fecdd3',
      gradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 50%, #be123c 100%)',
      glow: 'rgba(244, 63, 94, 0.15)',
      bgGradient: 'radial-gradient(circle at top right, #280a13 0%, #0d0407 60%, #050102 100%)'
    },
    ocean: {
      accent: '#06b6d4',
      accent2: '#cffafe',
      gradient: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 50%, #0e7490 100%)',
      glow: 'rgba(6, 182, 212, 0.15)',
      bgGradient: 'radial-gradient(circle at top right, #091e2b 0%, #030a10 60%, #010407 100%)'
    }
  };

  const THEME_LABELS = {
    gold: 'Or Royal',
    emerald: 'Émeraude Cyber',
    amethyst: 'Améthyste Rêve',
    ruby: 'Rubis Feu',
    ocean: 'Bleu Océan'
  };

  const init = async () => {
    const savedTheme = await StorageManager.getItem(STORAGE_KEYS.appTheme) || 'gold';
    applyTheme(savedTheme);
    activateThemeButton(savedTheme);
    applyAppIcon();
  };

  const selectTheme = async (themeId) => {
    if (!THEMES[themeId]) return;

    document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`theme-${themeId}`);
    if (activeEl) activeEl.classList.add('active');

    applyTheme(themeId);
    await StorageManager.setItem(STORAGE_KEYS.appTheme, themeId);
    showToast(`🎨 Thème appliqué : ${THEME_LABELS[themeId]}`);
  };

  const applyTheme = (themeId) => {
    const theme = THEMES[themeId] || THEMES.gold;
    const root = document.documentElement;

    root.style.setProperty('--gold', theme.accent);
    root.style.setProperty('--gold2', theme.accent2);
    root.style.setProperty('--gold-gradient', theme.gradient);
    root.style.setProperty('--gold-glow', theme.glow);
    root.style.setProperty('--bg-gradient', theme.bgGradient);
    root.style.setProperty('--border-hover', `rgba(${hexToRgb(theme.accent)}, 0.3)`);
  };

  const activateThemeButton = (themeId) => {
    document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`theme-${themeId}`);
    if (activeEl) activeEl.classList.add('active');
  };

  const applyAppIcon = () => {
    const manifestLink = document.getElementById('manifest-link');
    const faviconLink = document.getElementById('favicon-link');
    const appleIconLink = document.getElementById('apple-icon-link');

    if (manifestLink) {
      manifestLink.href = '/manifest.json';
    }
    if (faviconLink) {
      faviconLink.href = '/favicon.png';
    }
    if (appleIconLink) {
      appleIconLink.href = '/apple-touch-icon.png';
    }
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
      : '229, 192, 96';
  };

  return {
    init,
    selectTheme,
    applyTheme,
    applyAppIcon,
    THEMES,
    THEME_LABELS
  };
})();

export { ThemeManager };
