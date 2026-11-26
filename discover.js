/* ============================================
   NEXORA Discover Module - V3.5
   Uses real registered users from NexoraDB
   + mock users for demo density
   ============================================ */

const NexoraDiscover = (function () {
  const MOCK_USERS = [
    { username: 'ada_okafor', fullName: 'Ada Okafor', bio: 'Designer • Lagos', online: true },
    { username: 'james_ok', fullName: 'James Okonkwo', bio: 'Developer & creator', online: false },
    { username: 'sarah_m', fullName: 'Sarah Mensah', bio: 'Photographer | Accra', online: true },
    { username: 'tunde_dev', fullName: 'Tunde Adebayo', bio: 'Building the future', online: false },
    { username: 'chioma_n', fullName: 'Chioma Nwosu', bio: 'Writer & storyteller', online: true },
    { username: 'kofi_arts', fullName: 'Kofi Mensah', bio: 'Digital artist', online: false },
    { username: 'amina_k', fullName: 'Amina Kabir', bio: 'Student • Tech enthusiast', online: true },
    { username: 'david_p', fullName: 'David Peters', bio: 'Music producer', online: false }
  ];

  function getAllDiscoverableUsers() {
    const current = NexoraAuth.getCurrentUser();
    const currentUsername = current ? current.username : null;

    // Real registered users from DB
    const realUsers = (window.NexoraDB ? NexoraDB.getAllUsersArray() : [])
      .filter(u => u.username !== currentUsername)
      .map(u => ({
        username: u.username,
        fullName: u.fullName || u.username,
        bio: u.bio || 'NEXORA user',
        online: !!u.online,
        isReal: true
      }));

    // Merge with mocks (avoid duplicates by username)
    const realUsernames = new Set(realUsers.map(u => u.username));
    const mocks = MOCK_USERS.filter(u => u.username !== currentUsername && !realUsernames.has(u.username));

    return [...realUsers, ...mocks];
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderResults(container, users) {
    if (!container) return;

    if (users.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="1.8">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h3>No users found</h3>
          <p>Try a different name or username</p>
        </div>`;
      return;
    }

    container.innerHTML = users.map(u => `
      <div class="discover-item" data-username="${u.username}">
        <div class="chat-avatar ${u.online ? 'online' : ''}">${(u.fullName || u.username)[0]}</div>
        <div class="chat-info">
          <div class="chat-top">
            <span class="chat-name">${escapeHtml(u.fullName)}</span>
            ${u.online ? '<span class="online-label">Online</span>' : ''}
            ${u.isReal ? '<span class="you-badge">Registered</span>' : ''}
          </div>
          <div class="chat-bottom">
            <span class="chat-preview">@${escapeHtml(u.username)} · ${escapeHtml(u.bio || '')}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
          <button class="btn-message" data-username="${u.username}" data-name="${escapeHtml(u.fullName)}">Message</button>
          <div style="display:flex;gap:4px;">
            <button class="btn-unblock" style="font-size:0.68rem;padding:3px 8px;" data-block="${u.username}" data-name="${escapeHtml(u.fullName)}">Block</button>
            <button class="btn-unblock" style="font-size:0.68rem;padding:3px 8px;background:rgba(245,158,11,0.12);color:#fbbf24;border-color:rgba(245,158,11,0.3);" data-report="${u.username}" data-name="${escapeHtml(u.fullName)}">Report</button>
          </div>
        </div>
      </div>
    `).join('');

    // Message → create or open a local chat
    container.querySelectorAll('.btn-message').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uname = btn.dataset.username;
        const name = btn.dataset.name || uname;
        startChatWith(uname, name);
      });
    });

    // Block
    container.querySelectorAll('[data-block]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uname = btn.dataset.block;
        const name = btn.dataset.name;
        if (window.NexoraPrivacy && NexoraPrivacy.blockUser(uname, name)) {
          if (window.NexoraToast) NexoraToast.show(`@${uname} blocked`, 'success');
          search(document.getElementById('discover-search')?.value || '');
        }
      });
    });

    // Report
    container.querySelectorAll('[data-report]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const uname = btn.dataset.report;
        const name = btn.dataset.name;
        const reason = prompt('Why are you reporting @' + uname + '?\n\nExamples: Spam, Harassment, Fake account, Inappropriate content');
        if (reason && reason.trim() && window.NexoraPrivacy) {
          const result = NexoraPrivacy.reportUser(uname, name, reason.trim());
          if (result.success) {
            if (window.NexoraToast) NexoraToast.show('Report submitted. Thank you.', 'success');
          } else {
            if (window.NexoraToast) NexoraToast.show(result.error || 'Could not submit report', 'error');
          }
        }
      });
    });
  }

  function startChatWith(username, displayName) {
    if (!window.NexoraDB || !window.NexoraMessages) {
      if (window.NexoraToast) NexoraToast.show('Messaging not ready', 'error');
      return;
    }

    const chats = NexoraDB.getChats();
    let chat = chats.find(c => c.username === username && c.type === 'private');

    if (!chat) {
      chat = {
        id: 'chat_' + Date.now(),
        name: displayName,
        username: username,
        lastMessage: 'Chat started',
        time: 'Now',
        unread: 0,
        online: false,
        type: 'private',
        messages: [
          { id: 1, from: 'them', text: 'Hi! This is the start of your conversation.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]
      };
      chats.unshift(chat);
      NexoraDB.saveChats(chats);
    }

    if (window.NexoraApp) NexoraApp.switchScreen('messages');
    setTimeout(() => {
      if (window.NexoraMessages) NexoraMessages.openConversation(chat.id);
    }, 100);

    if (window.NexoraToast) NexoraToast.show(`Chat with ${displayName} opened`, 'success');
  }

  function search(query) {
    const q = (query || '').trim().toLowerCase();
    let users = getAllDiscoverableUsers();

    // Filter out blocked users
    if (window.NexoraPrivacy) {
      const blocked = new Set((NexoraPrivacy.getBlocked() || []).map(b => b.username));
      users = users.filter(u => !blocked.has(u.username));
    }

    if (q) {
      users = users.filter(u =>
        u.username.toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.bio || '').toLowerCase().includes(q)
      );
    }

    const container = document.getElementById('discover-results');
    renderResults(container, users);
  }

  function init() {
    const input = document.getElementById('discover-search');
    if (input) {
      input.addEventListener('input', () => search(input.value));
    }
    search('');
  }

  return { init, search };
})();
