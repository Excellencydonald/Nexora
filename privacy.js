/* ============================================
   NEXORA Privacy Module - V3.3
   Uses NexoraDB for blocked users & reports
   ============================================ */

const NexoraPrivacy = (function () {

  function getBlocked() {
    return NexoraDB.getBlocked();
  }

  function saveBlocked(list) {
    NexoraDB.saveBlocked(list);
  }

  function blockUser(username, displayName) {
    const list = getBlocked();
    if (list.find(u => u.username === username)) return false;
    list.push({
      username,
      displayName: displayName || username,
      blockedAt: Date.now()
    });
    saveBlocked(list);
    return true;
  }

  function unblockUser(username) {
    const list = getBlocked().filter(u => u.username !== username);
    saveBlocked(list);
  }

  function isBlocked(username) {
    return getBlocked().some(u => u.username === username);
  }

  function getReports() {
    return NexoraDB.getReports();
  }

  function reportUser(username, displayName, reason) {
    const current = NexoraAuth.getCurrentUser();
    if (!current) return { success: false, error: 'Not logged in' };

    const reports = getReports();
    if (reports.some(r => r.reporter === current.username && r.username === username)) {
      return { success: false, error: 'You already reported this account' };
    }

    NexoraDB.addReport({
      id: 'rep_' + Date.now(),
      username,
      displayName: displayName || username,
      reason,
      reporter: current.username,
      createdAt: Date.now()
    });

    return { success: true };
  }

  function getNotifPrefs() {
    const prefs = NexoraDB.getPrefs();
    return prefs.notifications || {
      messages: true,
      groups: true,
      calls: true,
      stories: true,
      ai: false
    };
  }

  function setNotifPref(key, value) {
    const prefs = NexoraDB.getPrefs();
    if (!prefs.notifications) prefs.notifications = {};
    prefs.notifications[key] = value;
    NexoraDB.savePrefs(prefs);
  }

  function renderBlockedList() {
    const container = document.getElementById('blocked-list');
    if (!container) return;

    const list = getBlocked();
    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:30px 16px;">
          <p>No blocked accounts</p>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">Blocked users will appear here</p>
        </div>`;
      return;
    }

    container.innerHTML = list.map(u => `
      <div class="blocked-item">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="chat-avatar" style="width:36px;height:36px;font-size:0.9rem;">${(u.displayName || u.username)[0]}</div>
          <div>
            <div style="font-weight:500;font-size:0.9rem;">${u.displayName}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">@${u.username}</div>
          </div>
        </div>
        <button class="btn-unblock" data-username="${u.username}">Unblock</button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-unblock').forEach(btn => {
      btn.addEventListener('click', () => {
        unblockUser(btn.dataset.username);
        renderBlockedList();
        if (window.NexoraToast) NexoraToast.show('User unblocked', 'success');
      });
    });
  }

  function renderNotifPrefs() {
    const prefs = getNotifPrefs();
    document.querySelectorAll('[data-notif]').forEach(el => {
      const key = el.dataset.notif;
      el.classList.toggle('on', !!prefs[key]);
    });
  }

  function init() {
    document.querySelectorAll('[data-notif]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.notif;
        const prefs = getNotifPrefs();
        const next = !prefs[key];
        setNotifPref(key, next);
        el.classList.toggle('on', next);
        if (window.NexoraToast) {
          NexoraToast.show(`${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${next ? 'on' : 'off'}`, 'info', 1500);
        }
      });
    });

    renderBlockedList();
    renderNotifPrefs();
  }

  return {
    init,
    blockUser,
    unblockUser,
    isBlocked,
    getBlocked,
    renderBlockedList,
    getNotifPrefs,
    reportUser,
    getReports
  };
})();
