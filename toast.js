/* ============================================
   NEXORA Toast Notifications - V1.5
   ============================================ */

const NexoraToast = (function () {
  let container = null;

  function ensureContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'info', duration = 3000) {
    const cont = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✓',
      error: '!',
      info: 'i'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'i'}</div>
      <span>${message}</span>
    `;

    cont.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-12px)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return { show };
})();