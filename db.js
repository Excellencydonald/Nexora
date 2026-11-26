/* ============================================
   NEXORA Local Database Layer - V3.1
   A more realistic local data layer using
   localStorage with structured collections.
   Designed so it can later be swapped for
   a real backend (Cloudflare D1 / Supabase etc.)
   ============================================ */

const NexoraDB = (function () {
  const PREFIX = 'nexora_v3_';

  function key(collection) {
    return PREFIX + collection;
  }

  function read(collection) {
    try {
      const raw = localStorage.getItem(key(collection));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function write(collection, data) {
    localStorage.setItem(key(collection), JSON.stringify(data));
  }

  // ---------- Users ----------
  function getUsers() {
    return read('users') || {};
  }

  function saveUser(user) {
    const users = getUsers();
    users[user.username] = user;
    write('users', users);
    return user;
  }

  function findUser(username) {
    const users = getUsers();
    return users[username] || null;
  }

  function getAllUsersArray() {
    return Object.values(getUsers());
  }

  function removeUser(username) {
    const users = getUsers();
    if (!users[username]) return false;
    delete users[username];
    write('users', users);
    return true;
  }

  // ---------- Session ----------
  function getSession() {
    return read('session');
  }

  function setSession(user) {
    write('session', user);
  }

  function clearSession() {
    localStorage.removeItem(key('session'));
  }

  // ---------- Messages / Chats ----------
  function getChats() {
    return read('chats') || [];
  }

  function saveChats(chats) {
    write('chats', chats);
  }

  function getChatById(id) {
    return getChats().find(c => c.id === id) || null;
  }

  // ---------- Stories ----------
  function getStories() {
    const stories = read('stories') || [];
    // Auto-expire
    const now = Date.now();
    const valid = stories.filter(s => (now - s.createdAt) < 24 * 60 * 60 * 1000);
    if (valid.length !== stories.length) {
      write('stories', valid);
    }
    return valid;
  }

  function saveStories(stories) {
    write('stories', stories);
  }

  function addStory(story) {
    const stories = getStories();
    stories.unshift(story);
    saveStories(stories);
    return story;
  }

  // ---------- Call History ----------
  function getCallHistory() {
    return read('call_history') || [];
  }

  function addCallRecord(record) {
    const history = getCallHistory();
    history.unshift(record);
    write('call_history', history.slice(0, 50));
  }

  // ---------- Privacy ----------
  function getBlocked() {
    return read('blocked') || [];
  }

  function saveBlocked(list) {
    write('blocked', list);
  }

  function getReports() {
    return read('reports') || [];
  }

  function addReport(report) {
    const reports = getReports();
    reports.push(report);
    write('reports', reports);
  }

  // ---------- AI Conversations ----------
  function getAIConversations() {
    return read('ai_conversations') || {};
  }

  function saveAIConversations(data) {
    write('ai_conversations', data);
  }

  // ---------- Preferences ----------
  function getPrefs() {
    return read('prefs') || {
      theme: 'dark',
      notifications: {
        messages: true,
        groups: true,
        calls: true,
        stories: true,
        ai: false
      },
      dataSaver: {
        mode: 'balanced',
        photoDownload: 'manual',
        videoDownload: 'manual',
        callQuality: 'high'
      }
    };
  }

  function savePrefs(prefs) {
    write('prefs', prefs);
  }

  // ---------- Seed demo data if empty ----------
  function seedIfEmpty() {
    if (getChats().length === 0) {
      const seedChats = [
        {
          id: 'chat_1',
          name: 'Ada Okafor',
          username: 'ada_okafor',
          lastMessage: 'Are we still meeting tomorrow?',
          time: '14:32',
          unread: 2,
          online: true,
          type: 'private',
          messages: [
            { id: 1, from: 'them', text: 'Hey! How are you?', time: '14:20' },
            { id: 2, from: 'me', text: 'I\'m good, thanks. You?', time: '14:25' },
            { id: 3, from: 'them', text: 'Are we still meeting tomorrow?', time: '14:32' }
          ]
        },
        {
          id: 'chat_2',
          name: 'James Okonkwo',
          username: 'james_ok',
          lastMessage: 'The design looks amazing 🔥',
          time: 'Yesterday',
          unread: 0,
          online: false,
          type: 'private',
          messages: [
            { id: 1, from: 'them', text: 'Just saw the new screens', time: 'Yesterday' },
            { id: 2, from: 'them', text: 'The design looks amazing 🔥', time: 'Yesterday' }
          ]
        },
        {
          id: 'group_1',
          name: 'Design Crew',
          lastMessage: 'New mockups are ready',
          time: '12:10',
          unread: 3,
          type: 'group',
          members: 5,
          messages: [
            { id: 1, from: 'them', text: 'Hey team, new mockups are ready', time: '12:05' },
            { id: 2, from: 'them', text: 'Check the shared folder', time: '12:08' }
          ]
        }
      ];
      saveChats(seedChats);
    }
  }

    function importAllData(data) {
    if (!data || typeof data !== 'object') return false;
    try {
      if (data.users) write('users', data.users);
      if (data.chats) write('chats', data.chats);
      if (data.stories) write('stories', data.stories);
      if (data.callHistory) write('call_history', data.callHistory);
      if (data.blocked) write('blocked', data.blocked);
      if (data.reports) write('reports', data.reports);
      if (data.prefs) write('prefs', data.prefs);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  return {
    // Users
    getUsers, saveUser, findUser, getAllUsersArray, removeUser,
    // Session
    getSession, setSession, clearSession,
    // Chats
    getChats, saveChats, getChatById,
    // Stories
    getStories, saveStories, addStory,
    // Calls
    getCallHistory, addCallRecord,
    // Privacy
    getBlocked, saveBlocked, getReports, addReport,
    // AI
    getAIConversations, saveAIConversations,
    // Prefs
    getPrefs, savePrefs,
    // Utils
    seedIfEmpty,
    importAllData
  };
})();
