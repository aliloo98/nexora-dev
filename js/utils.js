// Shared utility functions
const Utils = {
  fmt: (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €',

  showToast: (msg) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  },

  customConfirm: (title, message, onConfirm) => {
    const modal = document.getElementById('custom-modal');
    if (!modal) return;

    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('#modal-body-content').textContent = message;

    const btnYes = modal.querySelector('#modal-btn-confirm');
    const newBtnYes = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);

    newBtnYes.addEventListener('click', () => {
      closeModal();
      onConfirm();
    });

    modal.classList.add('active');
  },

  closeModal: () => {
    const modal = document.getElementById('custom-modal');
    if (modal) modal.classList.remove('active');
  }
};

// Make globally accessible
const showToast = (msg) => Utils.showToast(msg);
const closeModal = () => Utils.closeModal();
const customConfirm = (title, message, onConfirm) => Utils.customConfirm(title, message, onConfirm);

export { Utils, showToast, closeModal, customConfirm };
