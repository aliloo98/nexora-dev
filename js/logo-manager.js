// Logo Management System
const LogoManager = (() => {
  const LOGO_PRESETS = [
    { emoji: '💰', label: 'Trésor' },
    { emoji: '💎', label: 'Diamant' },
    { emoji: '👑', label: 'Roi' },
    { emoji: '💖', label: 'Cœur' },
    { emoji: '🌟', label: 'Étoile' },
    { emoji: '🔥', label: 'Feu' },
    { emoji: '🦄', label: 'Licorne' },
    { emoji: '🚀', label: 'Fusée' }
  ];

  let currentLogoType = 'emoji';
  let currentLogoValue = '💰';

  const init = async () => {
    const savedType = await StorageManager.getItem('budget_logo_type') || 'emoji';
    const savedValue = await StorageManager.getItem('budget_logo_value') || '💰';
    
    currentLogoType = savedType;
    currentLogoValue = savedValue;
    
    updateAppLogo(savedType, savedValue);
    renderLogoOptions();
  };

  const selectPresetLogo = (emoji) => {
    document.getElementById('logo-custom-emoji').value = '';
    updateAppLogo('emoji', emoji);
  };

  const setCustomEmojiLogo = (value) => {
    const emoji = value.trim();
    if (emoji !== '') {
      document.querySelectorAll('.logo-option-btn').forEach(btn => btn.classList.remove('active'));
      updateAppLogo('emoji', emoji);
    }
  };

  const uploadLogoImage = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const base64Str = e.target.result;
      updateAppLogo('image', base64Str);
    };
    reader.readAsDataURL(file);
  };

  const resetAppLogo = () => {
    updateAppLogo('emoji', '💰');
  };

  const updateAppLogo = async (type, value) => {
    const sidebarLogo = document.getElementById('app-sidebar-logo');
    const previewBox = document.getElementById('logo-preview');
    const resetBtn = document.getElementById('btn-reset-logo');

    if (!sidebarLogo || !previewBox) return;

    currentLogoType = type;
    currentLogoValue = value;

    await StorageManager.setItem('budget_logo_type', type);
    await StorageManager.setItem('budget_logo_value', value);

    if (type === 'emoji') {
      sidebarLogo.innerHTML = value;
      previewBox.innerHTML = value;
      if (resetBtn) resetBtn.style.display = value === '💰' ? 'none' : 'inline-block';

      document.querySelectorAll('.logo-option-btn').forEach(btn => {
        if (btn.textContent === value) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    } else if (type === 'image') {
      const imgHtml = `<img src="${value}" alt="Logo">`;
      sidebarLogo.innerHTML = imgHtml;
      previewBox.innerHTML = imgHtml;
      if (resetBtn) resetBtn.style.display = 'inline-block';

      document.querySelectorAll('.logo-option-btn').forEach(btn => btn.classList.remove('active'));
    }
  };

  const renderLogoOptions = () => {
    const grid = document.getElementById('logo-presets-grid');
    if (!grid) return;

    grid.innerHTML = LOGO_PRESETS.map(preset => `
      <button type="button" class="logo-option-btn ${currentLogoType === 'emoji' && currentLogoValue === preset.emoji ? 'active' : ''}" 
        onclick="LogoManager.selectPresetLogo('${preset.emoji}')" 
        title="${preset.label}">
        ${preset.emoji}
      </button>
    `).join('');
  };

  return {
    init,
    LOGO_PRESETS,
    selectPresetLogo,
    setCustomEmojiLogo,
    uploadLogoImage,
    resetAppLogo,
    updateAppLogo,
    renderLogoOptions
  };
})();

export { LogoManager };
