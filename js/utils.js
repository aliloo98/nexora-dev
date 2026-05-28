// Utility Functions & Confetti Engine
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

// Confetti Engine
const ConfettiEngine = (() => {
  let confettiActive = false;
  let confettiParticles = [];
  const confettiColors = ['#d4af37', '#f3e5ab', '#e5c060', '#b89130', '#906d18', '#ffd700'];

  class ConfettiParticle {
    constructor(canvasWidth, canvasHeight) {
      this.x = Math.random() * canvasWidth;
      this.y = Math.random() * -canvasHeight - 20;
      this.size = Math.random() * 8 + 6;
      this.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      this.speedX = Math.random() * 2 - 1;
      this.speedY = Math.random() * 3 + 2;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = Math.random() * 4 - 2;
      this.opacity = Math.random() * 0.4 + 0.6;
      this.widthScale = 1.0;
    }

    update(canvasWidth, canvasHeight) {
      this.x += this.speedX + Math.sin(this.y / 30) * 0.5;
      this.y += this.speedY;
      this.rotation += this.rotationSpeed;
      this.widthScale = Math.sin(this.y / 15);

      return this.y <= canvasHeight;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation * Math.PI / 180);
      ctx.scale(this.widthScale, 1.0);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(229, 192, 96, 0.3)';
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      ctx.restore();
    }
  }

  const trigger = () => {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (!confettiActive) {
      confettiActive = true;
      confettiParticles = [];
      for (let i = 0; i < 150; i++) {
        confettiParticles.push(new ConfettiParticle(canvas.width, canvas.height));
      }
      animate(canvas, ctx);
    } else {
      for (let i = 0; i < 100; i++) {
        confettiParticles.push(new ConfettiParticle(canvas.width, canvas.height));
      }
    }
  };

  const animate = (canvas, ctx) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    confettiParticles.forEach((p) => {
      const isAlive = p.update(canvas.width, canvas.height);
      if (isAlive) {
        p.draw(ctx);
        alive = true;
      }
    });

    if (alive && confettiActive) {
      requestAnimationFrame(() => animate(canvas, ctx));
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiActive = false;
    }
  };

  return { trigger };
})();

// Make globally accessible
const showToast = (msg) => Utils.showToast(msg);
const closeModal = () => Utils.closeModal();
const customConfirm = (title, message, onConfirm) => Utils.customConfirm(title, message, onConfirm);
const triggerConfetti = () => ConfettiEngine.trigger();

export { Utils, ConfettiEngine };
