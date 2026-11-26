/* ============================================
   NEXORA Core App - V5.1
   Navigation, auth gate, theme, profile
   ============================================ */

const NexoraApp = (function () {
  const SCREENS = ['messages', 'discover', 'stories', 'ai', 'calls', 'profile', 'settings', 'datasaver', 'command', 'call-ui', 'notifications', 'blocked', 'about'];
  let currentScreen = 'messages';

  function init() {
    // Theme (prefer DB prefs, fallback to localStorage)
    let savedTheme = 'dark';
    try {
      if (window.NexoraDB) {
        const prefs = NexoraDB.getPrefs();
        savedTheme = (prefs && prefs.theme) || localStorage.getItem('nexora_theme') || 'dark';
      } else {
        savedTheme = localStorage.getItem('nexora_theme') || 'dark';
      }
    } catch (e) {
      savedTheme = localStorage.getItem('nexora_theme') || 'dark';
    }
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Auth gate
    if (!NexoraAuth.isLoggedIn()) {
      showAuth();
    } else {
      hideAuth();
      refreshProfileUI();
        refreshProfileStats();
        if (window.NexoraToast) NexoraToast.show('Profile updated', 'success');
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        const screen = item.dataset.screen;
        if (screen) switchScreen(screen);
      });
    });

    // Theme toggles
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    document.getElementById('settings-theme-toggle')?.addEventListener('click', toggleTheme);

    // Auth forms
    setupAuthForms();

    // Profile
    setupProfile();
    setupAccountActions();
    setupDataSaver();

    // Init modules
    // AI Coming Soon — init disabled
    // if (window.NexoraAI) NexoraAI.init();
    if (window.NexoraMessages) NexoraMessages.init();
    if (window.NexoraDiscover) NexoraDiscover.init();
    if (window.NexoraStories) NexoraStories.init();
    if (window.NexoraCalls) NexoraCalls.init();
    if (window.NexoraCommand) NexoraCommand.init();
    if (window.NexoraPrivacy) NexoraPrivacy.init();

    // Default screen when logged in
    if (NexoraAuth.isLoggedIn()) {
      switchScreen('messages');
    }

    if (window.NexoraDB) NexoraDB.seedIfEmpty();
    console.log('NEXORA V5.1 initialised');
  }

  // ---------- Auth UI ----------
  function showAuth() {
    document.getElementById('auth-overlay')?.classList.add('active');
    document.getElementById('bottom-nav')?.classList.add('hidden');
    document.querySelector('.app-header')?.classList.add('hidden');
  }

  
  function showWelcomeIfNeeded() {
    if (localStorage.getItem('nexora_welcome_seen')) return;
    const main = document.querySelector('.main-content');
    if (!main) return;
    const banner = document.createElement('div');
    banner.className = 'welcome-banner';
    banner.id = 'welcome-banner';
    banner.innerHTML = `
      <div style="flex:1;">
        <strong style="display:block;margin-bottom:2px;">Welcome to NEXORA</strong>
        <span style="font-size:0.8rem;color:var(--text-secondary);">Explore Messages, Stories, Discover and NEXORA AI. Have fun!</span>
      </div>
      <button aria-label="Dismiss">×</button>
    `;
    // Insert at top of messages screen when active, or just show toast
    if (window.NexoraToast) {
      NexoraToast.show('Welcome to NEXORA! Explore the tabs below.', 'success', 4000);
    }
    localStorage.setItem('nexora_welcome_seen', '1');
  }

  function hideAuth() {
    document.getElementById('auth-overlay')?.classList.remove('active');
    document.getElementById('bottom-nav')?.classList.remove('hidden');
    document.querySelector('.app-header')?.classList.remove('hidden');
  }

  function setupAuthForms() {
    // Switch views
    document.getElementById('show-register')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-view')?.classList.add('hidden');
      document.getElementById('recover-view')?.classList.add('hidden');
      document.getElementById('register-view')?.classList.remove('hidden');
    });
    document.getElementById('show-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('register-view')?.classList.add('hidden');
      document.getElementById('recover-view')?.classList.add('hidden');
      document.getElementById('login-view')?.classList.remove('hidden');
    });

    document.getElementById('show-recover')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-view')?.classList.add('hidden');
      document.getElementById('register-view')?.classList.add('hidden');
      document.getElementById('recover-view')?.classList.remove('hidden');
      const err = document.getElementById('recover-error');
      if (err) { err.textContent = ''; err.classList.remove('show'); }
      const q = document.getElementById('recover-question');
      if (q) q.textContent = 'Enter username first';
    });

    document.getElementById('recover-back-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('recover-view')?.classList.add('hidden');
      document.getElementById('login-view')?.classList.remove('hidden');
    });

    // Load security question when username entered
    document.getElementById('recover-username')?.addEventListener('blur', () => {
      const username = document.getElementById('recover-username').value;
      const qEl = document.getElementById('recover-question');
      if (!username || !qEl) return;
      const result = NexoraAuth.getSecurityQuestion(username);
      qEl.textContent = result.success ? result.question : (result.error || 'Username not found');
    });

    document.getElementById('recover-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('recover-username').value;
      const answer = document.getElementById('recover-answer').value;
      const newPassword = document.getElementById('recover-new-password').value;
      const confirm = document.getElementById('recover-confirm').value;
      const errEl = document.getElementById('recover-error');

      if (newPassword !== confirm) {
        errEl.textContent = 'Passwords do not match.';
        errEl.classList.add('show');
        return;
      }

      const result = NexoraAuth.resetPasswordWithSecurity(username, answer, newPassword);
      if (result.success) {
        errEl.classList.remove('show');
        if (window.NexoraToast) NexoraToast.show('Password reset. Please log in.', 'success');
        document.getElementById('recover-view')?.classList.add('hidden');
        document.getElementById('login-view')?.classList.remove('hidden');
        document.getElementById('login-username').value = username.trim().toLowerCase();
      } else {
        errEl.textContent = result.error || 'Recovery failed';
        errEl.classList.add('show');
      }
    });

    // Login
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      const result = NexoraAuth.login(username, password);
      const errEl = document.getElementById('login-error');

      if (result.success) {
        errEl.classList.remove('show');
        hideAuth();
        refreshProfileUI();
        refreshProfileStats();
        if (window.NexoraToast) NexoraToast.show('Welcome back', 'success');
        switchScreen('messages');
        showWelcomeIfNeeded();
        if (window.NexoraMessages) NexoraMessages.init();
      } else {
        errEl.textContent = result.error;
        errEl.classList.add('show');
      }
    });

    // Register
    document.getElementById('register-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('reg-fullname').value;
      const username = document.getElementById('reg-username').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const confirm = document.getElementById('reg-confirm').value;
      const securityQ = document.getElementById('reg-security-q')?.value || '';
      const securityA = document.getElementById('reg-security-a')?.value || '';
      const errEl = document.getElementById('register-error');

      if (password !== confirm) {
        errEl.textContent = 'Passwords do not match.';
        errEl.classList.add('show');
        return;
      }

      const result = NexoraAuth.register(username, password, fullName, securityQ, securityA);
      if (result.success) {
        errEl.classList.remove('show');
        hideAuth();
        refreshProfileUI();
        refreshProfileStats();
        if (window.NexoraToast) NexoraToast.show('Account created', 'success');
        switchScreen('messages');
        showWelcomeIfNeeded();
        if (window.NexoraMessages) NexoraMessages.init();
      } else {
        errEl.textContent = result.error;
        errEl.classList.add('show');
      }
    });
  }

  // ---------- Profile ----------
  
  function refreshProfileStats() {
    try {
      const user = NexoraAuth.getCurrentUser();
      let myStories = 0;
      let chatCount = 0;
      if (window.NexoraDB) {
        const stories = NexoraDB.getStories();
        myStories = user ? stories.filter(s => s.username === user.username).length : 0;
        chatCount = NexoraDB.getChats().length;
      }
      const el1 = document.getElementById('stat-stories');
      if (el1) el1.textContent = myStories;
      const el2 = document.getElementById('stat-chats');
      if (el2) el2.textContent = chatCount;
    } catch(e) {}
  }

  function refreshProfileUI() {
    const user = NexoraAuth.getCurrentUser();
    if (!user) return;

    const avatar = document.getElementById('profile-avatar');
    const name = document.getElementById('profile-name');
    const uname = document.getElementById('profile-username');
    const bio = document.getElementById('profile-bio');

    if (avatar) avatar.textContent = user.avatarLetter || 'N';
    if (name) name.textContent = user.fullName || 'User';
    if (uname) uname.textContent = '@' + (user.username || 'user');
    if (bio) bio.textContent = user.bio || 'No bio yet. Tap Edit Profile to add one.';
  }

  function setupProfile() {
    // Edit button
    document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
      const user = NexoraAuth.getCurrentUser();
      if (!user) return;
      document.getElementById('edit-fullname').value = user.fullName || '';
      document.getElementById('edit-bio').value = user.bio || '';
      document.getElementById('profile-view').classList.add('hidden');
      document.getElementById('profile-edit').classList.remove('hidden');
    });

    // Cancel
    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
      document.getElementById('profile-edit').classList.add('hidden');
      document.getElementById('profile-view').classList.remove('hidden');
    });

    // Save
    document.getElementById('profile-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fullName = document.getElementById('edit-fullname').value;
      const bio = document.getElementById('edit-bio').value;
      const result = NexoraAuth.updateProfile({ fullName, bio });
      if (result.success) {
        refreshProfileUI();
        refreshProfileStats();
        if (window.NexoraToast) NexoraToast.show('Profile updated', 'success');
        document.getElementById('profile-edit').classList.add('hidden');
        document.getElementById('profile-view').classList.remove('hidden');
      }
    });

    // Logout
    const onlineToggle = document.getElementById('toggle-online');
    if (onlineToggle) {
      const user = NexoraAuth.getCurrentUser();
      onlineToggle.classList.toggle('on', !!(user && user.online));
      onlineToggle.addEventListener('click', () => {
        const next = !onlineToggle.classList.contains('on');
        const result = NexoraAuth.setOnlineStatus(next);
        if (result.success) {
          onlineToggle.classList.toggle('on', result.online);
          if (window.NexoraToast) NexoraToast.show(result.online ? 'You appear online' : 'You appear offline', 'info', 1500);
        }
      });
    }

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      if (confirm('Log out of NEXORA?')) {
        NexoraAuth.logout();
        showAuth();
        document.getElementById('register-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
      }
    });
  }



  function setupDataSaver() {
    const prefs = (window.NexoraDB && NexoraDB.getPrefs()) || {};
    const ds = prefs.dataSaver || {};
    const map = {
      'data-mode': ds.mode || 'balanced',
      'photo-dl': ds.photoDownload || 'manual',
      'video-dl': ds.videoDownload || 'manual',
      'call-quality': ds.callQuality || 'high'
    };
    Object.keys(map).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = map[id];
    });

    ['data-mode', 'photo-dl', 'video-dl', 'call-quality'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        if (!window.NexoraDB) return;
        const prefs = NexoraDB.getPrefs();
        if (!prefs.dataSaver) prefs.dataSaver = {};
        const keyMap = {
          'data-mode': 'mode',
          'photo-dl': 'photoDownload',
          'video-dl': 'videoDownload',
          'call-quality': 'callQuality'
        };
        prefs.dataSaver[keyMap[id]] = e.target.value;
        NexoraDB.savePrefs(prefs);
        if (window.NexoraToast) NexoraToast.show('Data Saver updated', 'success', 1500);
      });
    });
  }

  function setupAccountActions() {
    document.getElementById('btn-change-password')?.addEventListener('click', () => {
      const current = prompt('Enter current password:');
      if (current === null) return;
      const next = prompt('Enter new password (min 6 characters):');
      if (next === null) return;
      const confirmPw = prompt('Confirm new password:');
      if (confirmPw === null) return;
      if (next !== confirmPw) {
        if (window.NexoraToast) NexoraToast.show('Passwords do not match', 'error');
        return;
      }
      const result = NexoraAuth.changePassword(current, next);
      if (result.success) {
        if (window.NexoraToast) NexoraToast.show('Password updated', 'success');
      } else {
        if (window.NexoraToast) NexoraToast.show(result.error || 'Failed', 'error');
      }
    });

    document.getElementById('btn-delete-account')?.addEventListener('click', () => {
      if (!confirm('Delete your account permanently? This cannot be undone.')) return;
      const password = prompt('Enter your password to confirm:');
      if (password === null) return;
      const result = NexoraAuth.deleteAccount(password);
      if (result.success) {
        if (window.NexoraToast) NexoraToast.show('Account deleted', 'info');
        showAuth();
        document.getElementById('register-view')?.classList.add('hidden');
        document.getElementById('login-view')?.classList.remove('hidden');
      } else {
        if (window.NexoraToast) NexoraToast.show(result.error || 'Failed', 'error');
      }
    });
  }

  // ---------- Navigation ----------
  function switchScreen(name) {
    if (!SCREENS.includes(name)) return;
    if (!NexoraAuth.isLoggedIn()) return;

    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.screen === name);
    });

    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.toggle('active', screen.id === `screen-${name}`);
    });

    const titles = {
      messages: 'Messages',
      discover: 'Discover',
      stories: 'Stories',
      ai: 'NEXORA AI',
      calls: 'Calls',
      profile: 'Profile',
      settings: 'Settings',
      datasaver: 'Data Saver',
      command: 'Command Center',
      'call-ui': 'Call',
      notifications: 'Notifications',
      blocked: 'Blocked Accounts',
      about: 'About'
    };
    const titleEl = document.getElementById('header-title');
    if (titleEl) titleEl.textContent = titles[name] || 'NEXORA';

    if (name !== 'messages' && window.NexoraMessages) {
      NexoraMessages.closeConversation();
    }

    if (name === 'stories' && window.NexoraStories) {
      NexoraStories.render();
    }
    if (name === 'discover' && window.NexoraDiscover) {
      NexoraDiscover.init();
    }
    if (name === 'command' && window.NexoraCommand) {
      NexoraCommand.render();
    }
    if (name === 'blocked' && window.NexoraPrivacy) {
      NexoraPrivacy.renderBlockedList();
    }

    currentScreen = name;
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nexora_theme', next);
    try {
      if (window.NexoraDB) {
        const prefs = NexoraDB.getPrefs();
        prefs.theme = next;
        NexoraDB.savePrefs(prefs);
      }
    } catch (e) {}
  }

  return {
    init,
    switchScreen
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  NexoraApp.init();
});
