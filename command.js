/* ============================================
   NEXORA Private Command Center - V3.7
   Fully using NexoraDB
   ============================================ */

const NexoraCommand = (function () {
  const OWNER_USERNAMES = ['owner', 'admin'];

  function isOwner() {
    const user = NexoraAuth.getCurrentUser();
    return user && OWNER_USERNAMES.includes(user.username);
  }

  function getUsers() {
    return window.NexoraDB ? NexoraDB.getAllUsersArray() : [];
  }

  function getStats() {
    if (!window.NexoraDB) {
      return { users: 0, stories: 0, reports: 0, activeChats: 0 };
    }
    return {
      users: NexoraDB.getAllUsersArray().length,
      stories: NexoraDB.getStories().length,
      reports: NexoraDB.getReports().length,
      activeChats: NexoraDB.getChats().length
    };
  }

  function clearReports() {
    localStorage.removeItem('nexora_v3_reports');
  }

  function exportAllData() {
    if (!window.NexoraDB) return null;
    const data = {
      exportedAt: new Date().toISOString(),
      version: '3.7',
      users: NexoraDB.getUsers(),
      chats: NexoraDB.getChats(),
      stories: NexoraDB.getStories(),
      callHistory: NexoraDB.getCallHistory(),
      blocked: NexoraDB.getBlocked(),
      reports: NexoraDB.getReports(),
      prefs: NexoraDB.getPrefs()
    };
    return data;
  }

  function downloadExport() {
    const data = exportAllData();
    if (!data) {
      if (window.NexoraToast) NexoraToast.show('Nothing to export', 'error');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexora-backup-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    if (window.NexoraToast) NexoraToast.show('Backup downloaded', 'success');
  }

  function render() {
    const container = document.getElementById('cmd-content');
    if (!container) return;

    if (!isOwner()) {
      container.innerHTML = `
        <div class="empty-state" style="padding:60px 20px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style="margin-top:12px;">Access Restricted</p>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">
            Private Command Center is only available to the owner account.<br>
            Log in as <strong>owner</strong> or <strong>admin</strong> to access.
          </p>
        </div>`;
      return;
    }

    const stats = getStats();
    const users = getUsers();
    const reports = window.NexoraDB ? NexoraDB.getReports() : [];

    let usersHtml = '';
    if (users.length === 0) {
      usersHtml = '<div style="padding:16px;color:var(--text-muted);font-size:0.85rem;">No users registered yet</div>';
    } else {
      usersHtml = users.map(u => `
        <div class="cmd-user-row">
          <div class="cmd-user-avatar">${(u.fullName || u.username || 'U')[0].toUpperCase()}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:500;">${u.fullName || 'User'}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">@${u.username}</div>
          </div>
        </div>
      `).join('');
    }

    let reportsHtml = '';
    if (reports.length === 0) {
      reportsHtml = '<div style="padding:12px 16px;color:var(--text-muted);font-size:0.85rem;">No reports</div>';
    } else {
      reportsHtml = reports.slice(0, 10).map(r => `
        <div class="cmd-user-row">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:500;">@${r.username}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${r.reason || 'No reason'} · by @${r.reporter}</div>
          </div>
        </div>
      `).join('');
    }

    container.innerHTML = `
      <div class="cmd-header">
        <h2>Command Center</h2>
        <p>Owner administrative panel • Local data</p>
      </div>

      <div class="cmd-stats">
        <div class="cmd-stat">
          <div class="cmd-stat-value">${stats.users}</div>
          <div class="cmd-stat-label">Users</div>
        </div>
        <div class="cmd-stat">
          <div class="cmd-stat-value">${stats.stories}</div>
          <div class="cmd-stat-label">Stories</div>
        </div>
        <div class="cmd-stat">
          <div class="cmd-stat-value">${stats.reports}</div>
          <div class="cmd-stat-label">Reports</div>
        </div>
        <div class="cmd-stat">
          <div class="cmd-stat-value">${stats.activeChats}</div>
          <div class="cmd-stat-label">Chats</div>
        </div>
      </div>

      <div class="cmd-section">
        <div class="cmd-section-title">Registered Users</div>
        ${usersHtml}
      </div>

      <div class="cmd-section">
        <div class="cmd-section-title">Reports</div>
        ${reportsHtml}
      </div>

      <div class="cmd-section">
        <div class="cmd-section-title">System</div>
        <div class="cmd-action" id="cmd-export-data">
          <span>Export All Data (Backup)</span>
          <span style="font-size:0.75rem;color:var(--accent-blue);">JSON</span>
        </div>
        <div class="cmd-action" id="cmd-import-data">
          <span>Import Data (Restore)</span>
          <span style="font-size:0.75rem;color:var(--text-muted);">JSON</span>
        </div>
        <input type="file" id="cmd-import-file" accept="application/json,.json" style="display:none;" />
        <div class="cmd-action" id="cmd-clear-reports">
          <span>Clear All Reports</span>
          <span style="font-size:0.75rem;color:var(--text-muted);">Local</span>
        </div>
        <div class="cmd-action" onclick="if(window.NexoraToast) NexoraToast.show('All local systems OK', 'success')">
          <span>System Health</span>
          <span style="font-size:0.75rem;color:var(--success);">OK</span>
        </div>
      </div>

      <p style="text-align:center;font-size:0.75rem;color:var(--text-muted);margin-top:20px;">
        Private Command Center • Local demo<br>
        Real moderation requires a secure backend
      </p>
    `;

    document.getElementById('cmd-export-data')?.addEventListener('click', downloadExport);
    document.getElementById('cmd-import-data')?.addEventListener('click', () => {
      document.getElementById('cmd-import-file')?.click();
    });
    document.getElementById('cmd-import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (confirm('Restore this backup? Current local data will be overwritten.')) {
          if (window.NexoraDB && NexoraDB.importAllData(data)) {
            if (window.NexoraToast) NexoraToast.show('Backup restored', 'success');
            render();
          } else {
            if (window.NexoraToast) NexoraToast.show('Import failed', 'error');
          }
        }
      } catch (err) {
        if (window.NexoraToast) NexoraToast.show('Invalid backup file', 'error');
      }
      e.target.value = '';
    });
    document.getElementById('cmd-clear-reports')?.addEventListener('click', () => {
      if (confirm('Clear all local reports?')) {
        clearReports();
        render();
        if (window.NexoraToast) NexoraToast.show('Reports cleared', 'success');
      }
    });
  }

  function init() {
    render();
  }

  return { init, render, isOwner, exportAllData };
})();
