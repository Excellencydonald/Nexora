/* ============================================
   NEXORA Messages Module - V3.2
   Now using the structured NexoraDB layer
   ============================================ */

const NexoraMessages = (function () {
  let currentTab = 'private';
  let searchQuery = '';

  function getChats() {
    return NexoraDB.getChats();
  }

  function saveChats(chats) {
    NexoraDB.saveChats(chats);
  }

  function getChat(id) {
    return NexoraDB.getChatById(id);
  }

  function sendMessage(chatId, text) {
    const chats = getChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat || !text.trim()) return null;

    const msg = {
      id: Date.now(),
      from: 'me',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    chat.messages.push(msg);
    chat.lastMessage = text.trim();
    chat.time = 'Now';
    chat.unread = 0;
    saveChats(chats);
    return msg;
  }

  function markAsRead(chatId) {
    const chats = getChats();
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      chat.unread = 0;
      saveChats(chats);
    }
  }

  function formatListTime(chat) {
    if (!chat) return '';
    if (chat.time && chat.time !== 'Now') return chat.time;
    // Prefer last message timestamp if numeric id/time available
    const msgs = chat.messages || [];
    if (msgs.length) {
      const last = msgs[msgs.length - 1];
      if (typeof last.id === 'number' && last.id > 1e12) {
        const diff = Date.now() - last.id;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Now';
        if (mins < 60) return mins + 'm';
        const hours = Math.floor(mins / 60);
        if (hours < 24) return hours + 'h';
      }
      return last.time || chat.time || '';
    }
    return chat.time || '';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderChatList() {
    const container = document.getElementById('chat-list');
    if (!container) return;

    let chats = getChats().filter(c =>
      currentTab === 'private' ? c.type !== 'group' : c.type === 'group'
    );
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      chats = chats.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q) ||
        (c.username || '').toLowerCase().includes(q)
      );
    }

    // Pinned chats first
    chats.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    if (chats.length === 0) {
      const searching = !!searchQuery;
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="1.8">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3>${searching ? 'No matches' : ('No ' + (currentTab === 'private' ? 'chats' : 'groups') + ' yet')}</h3>
          <p>${searching ? 'Try a different name or keyword' : (currentTab === 'private' ? 'Start a conversation from Discover' : 'Tap + to create a group')}</p>
        </div>`;
      return;
    }

    if (currentTab === 'private') {
      container.innerHTML = chats.map(chat => `
        <div class="chat-item" data-chat-id="${chat.id}">
          <div class="chat-avatar ${chat.online ? 'online' : ''}">${chat.name[0]}</div>
          <div class="chat-info">
            <div class="chat-top">
              <span class="chat-name">${chat.pinned ? '📌 ' : ''}${escapeHtml(chat.name)}${chat.muted ? ' 🔇' : ''}</span>
              <span class="chat-time">${formatListTime(chat)}</span>
            </div>
            <div class="chat-bottom">
              <span class="chat-preview">${escapeHtml(chat.lastMessage)}</span>
              ${chat.unread > 0 && !chat.muted ? `<span class="unread-badge">${chat.unread}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = chats.map(chat => `
        <div class="group-item" data-chat-id="${chat.id}">
          <div class="group-avatar">${chat.name.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
          <div class="chat-info">
            <div class="chat-top">
              <span class="chat-name">${chat.pinned ? '📌 ' : ''}${escapeHtml(chat.name)}${chat.muted ? ' 🔇' : ''}</span>
              <span class="chat-time">${formatListTime(chat)}</span>
            </div>
            <div class="chat-bottom">
              <span class="chat-preview">${escapeHtml(chat.lastMessage)}</span>
              ${chat.unread > 0 && !chat.muted ? `<span class="unread-badge">${chat.unread}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }

    container.querySelectorAll('[data-chat-id]').forEach(item => {
      item.addEventListener('click', () => openConversation(item.dataset.chatId));
    });
  }

  function openConversation(chatId) {
    const chat = getChat(chatId);
    if (!chat) return;

    markAsRead(chatId);

    document.getElementById('messages-list-view')?.classList.add('hidden');
    document.getElementById('messages-conv-view')?.classList.remove('hidden');

    const nameEl = document.getElementById('conv-name');
    const statusEl = document.getElementById('conv-status');
    if (nameEl) nameEl.textContent = chat.name;
    if (statusEl) {
      statusEl.textContent = chat.type === 'group'
        ? `${chat.members || '?'} members`
        : (chat.online ? 'Online' : 'Offline');
    }

    const container = document.getElementById('conv-messages');
    if (container) {
      container.innerHTML = chat.messages.map(m => `
        <div class="conv-msg ${m.from}" data-msg-id="${m.id}">
          <div class="conv-bubble" data-copy="${escapeHtml(m.text)}">${escapeHtml(m.text)}</div>
          <div class="conv-meta">${m.time}${m.from === 'me' ? ' · hold to delete' : ''}</div>
        </div>
      `).join('');
      container.querySelectorAll('.conv-bubble[data-copy]').forEach(b => {
        b.addEventListener('click', () => {
          const text = b.getAttribute('data-copy') || b.textContent;
          navigator.clipboard.writeText(text).then(() => {
            if (window.NexoraToast) NexoraToast.show('Message copied', 'success', 1200);
          }).catch(() => {});
        });
      });
      container.querySelectorAll('.conv-msg.me').forEach(row => {
        let timer;
        const start = () => { timer = setTimeout(() => {
          const msgId = row.dataset.msgId;
          if (!msgId) return;
          if (confirm('Delete this message?')) {
            deleteMessage(chatId, msgId);
            openConversation(chatId);
            if (window.NexoraToast) NexoraToast.show('Message deleted', 'success');
          }
        }, 550); };
        const cancel = () => clearTimeout(timer);
        row.addEventListener('mousedown', start);
        row.addEventListener('mouseup', cancel);
        row.addEventListener('mouseleave', cancel);
        row.addEventListener('touchstart', start, { passive: true });
        row.addEventListener('touchend', cancel);
        row.addEventListener('touchmove', cancel);
      });
      container.scrollTop = container.scrollHeight;
      container.dataset.chatId = chatId;
    }
  }

  function closeConversation() {
    document.getElementById('messages-conv-view')?.classList.add('hidden');
    document.getElementById('messages-list-view')?.classList.remove('hidden');
    renderChatList();
  }

  function handleSend() {
    const input = document.getElementById('conv-input');
    const container = document.getElementById('conv-messages');
    if (!input || !container) return;

    const chatId = container.dataset.chatId;
    const text = input.value.trim();
    if (!text || !chatId) return;

    sendMessage(chatId, text);
    input.value = '';

    const chat = getChat(chatId);
    if (chat) {
      container.innerHTML = chat.messages.map(m => `
        <div class="conv-msg ${m.from}" data-msg-id="${m.id}">
          <div class="conv-bubble" data-copy="${escapeHtml(m.text)}">${escapeHtml(m.text)}</div>
          <div class="conv-meta">${m.time}${m.from === 'me' ? ' · hold to delete' : ''}</div>
        </div>
      `).join('');
      container.querySelectorAll('.conv-bubble[data-copy]').forEach(b => {
        b.addEventListener('click', () => {
          const text = b.getAttribute('data-copy') || b.textContent;
          navigator.clipboard.writeText(text).then(() => {
            if (window.NexoraToast) NexoraToast.show('Message copied', 'success', 1200);
          }).catch(() => {});
        });
      });
      container.querySelectorAll('.conv-msg.me').forEach(row => {
        let timer;
        const start = () => { timer = setTimeout(() => {
          const msgId = row.dataset.msgId;
          if (!msgId) return;
          if (confirm('Delete this message?')) {
            deleteMessage(chatId, msgId);
            openConversation(chatId);
            if (window.NexoraToast) NexoraToast.show('Message deleted', 'success');
          }
        }, 550); };
        const cancel = () => clearTimeout(timer);
        row.addEventListener('mousedown', start);
        row.addEventListener('mouseup', cancel);
        row.addEventListener('mouseleave', cancel);
        row.addEventListener('touchstart', start, { passive: true });
        row.addEventListener('touchend', cancel);
        row.addEventListener('touchmove', cancel);
      });
      container.scrollTop = container.scrollHeight;
    }
  }

  function createGroup(name) {
    name = (name || '').trim();
    if (!name) return null;
    const chats = getChats();
    const group = {
      id: 'group_' + Date.now(),
      name: name,
      lastMessage: 'Group created',
      time: 'Now',
      unread: 0,
      type: 'group',
      members: 1,
      messages: [
        {
          id: Date.now(),
          from: 'them',
          text: 'Welcome to ' + name + '. Start chatting!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    chats.unshift(group);
    saveChats(chats);
    return group;
  }

  function deleteMessage(chatId, messageId) {
    const chats = getChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return false;
    chat.messages = (chat.messages || []).filter(m => String(m.id) !== String(messageId));
    if (chat.messages.length) {
      const last = chat.messages[chat.messages.length - 1];
      chat.lastMessage = last.text;
      chat.time = last.time || 'Now';
    } else {
      chat.lastMessage = 'No messages yet';
      chat.time = 'Now';
    }
    saveChats(chats);
    return true;
  }

  function clearChat(chatId) {
    if (!chatId) return false;
    const chats = getChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return false;
    chat.messages = [];
    chat.lastMessage = 'No messages yet';
    chat.unread = 0;
    saveChats(chats);
    return true;
  }

  function togglePin(chatId) {
    const chats = getChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return false;
    chat.pinned = !chat.pinned;
    saveChats(chats);
    return chat.pinned;
  }

  function toggleMute(chatId) {
    const chats = getChats();
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return false;
    chat.muted = !chat.muted;
    saveChats(chats);
    return chat.muted;
  }

  function deleteChat(chatId) {
    if (!chatId) return false;
    const chats = getChats().filter(c => c.id !== chatId);
    saveChats(chats);
    return true;
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.messages-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    renderChatList();
  }

  function init() {
    // Ensure demo data exists
    if (window.NexoraDB) NexoraDB.seedIfEmpty();

    renderChatList();

    document.getElementById('conv-back')?.addEventListener('click', closeConversation);
    document.getElementById('conv-pin')?.addEventListener('click', () => {
      const container = document.getElementById('conv-messages');
      const chatId = container && container.dataset.chatId;
      if (!chatId) return;
      const pinned = togglePin(chatId);
      renderChatList();
      if (window.NexoraToast) NexoraToast.show(pinned ? 'Chat pinned' : 'Chat unpinned', 'success');
    });
    document.getElementById('conv-mute')?.addEventListener('click', () => {
      const container = document.getElementById('conv-messages');
      const chatId = container && container.dataset.chatId;
      if (!chatId) return;
      const muted = toggleMute(chatId);
      renderChatList();
      if (window.NexoraToast) NexoraToast.show(muted ? 'Chat muted' : 'Chat unmuted', 'info');
    });
    document.getElementById('conv-clear')?.addEventListener('click', () => {
      const container = document.getElementById('conv-messages');
      const chatId = container && container.dataset.chatId;
      if (!chatId) return;
      if (confirm('Clear all messages in this chat? The chat will stay in your list.')) {
        clearChat(chatId);
        // Re-render conversation
        const chat = getChat(chatId);
        if (container && chat) {
          container.innerHTML = chat.messages.length ? chat.messages.map(m => `
            <div class="conv-msg ${m.from}">
              <div class="conv-bubble" data-copy="${escapeHtml(m.text)}">${escapeHtml(m.text)}</div>
              <div class="conv-meta">${m.time}</div>
            </div>
          `).join('') : '<div class="empty-state" style="padding:40px 16px;"><p>No messages yet</p></div>';
          container.querySelectorAll('.conv-bubble[data-copy]').forEach(b => {
            b.addEventListener('click', () => {
              const text = b.getAttribute('data-copy') || b.textContent;
              navigator.clipboard.writeText(text).then(() => {
                if (window.NexoraToast) NexoraToast.show('Message copied', 'success', 1200);
              }).catch(() => {});
            });
          });
        }
        renderChatList();
        if (window.NexoraToast) NexoraToast.show('Messages cleared', 'success');
      }
    });
    document.getElementById('conv-delete')?.addEventListener('click', () => {
      const container = document.getElementById('conv-messages');
      const chatId = container && container.dataset.chatId;
      if (!chatId) return;
      if (confirm('Delete this chat? This cannot be undone.')) {
        deleteChat(chatId);
        closeConversation();
        if (window.NexoraToast) NexoraToast.show('Chat deleted', 'success');
      }
    });
    document.getElementById('conv-send')?.addEventListener('click', handleSend);
    document.getElementById('conv-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    document.querySelectorAll('.messages-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    const searchInput = document.getElementById('chat-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim();
        renderChatList();
      });
    }

    document.getElementById('btn-new-group')?.addEventListener('click', () => {
      const name = prompt('Group name:');
      if (!name || !name.trim()) return;
      const group = createGroup(name.trim());
      if (group) {
        currentTab = 'group';
        document.querySelectorAll('.messages-tab').forEach(t => {
          t.classList.toggle('active', t.dataset.tab === 'group');
        });
        renderChatList();
        openConversation(group.id);
        if (window.NexoraToast) NexoraToast.show('Group created', 'success');
      }
    });
  }

  return {
    init,
    renderChatList,
    openConversation,
    closeConversation,
    switchTab,
    deleteChat,
    clearChat,
    deleteMessage,
    createGroup,
    togglePin,
    toggleMute
  };
})();
