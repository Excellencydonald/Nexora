/* ============================================
   NEXORA Auth Module - V3.1
   Uses the new structured local DB layer
   ============================================ */

const NexoraAuth = (function () {

  function ensureDB() {
    if (typeof NexoraDB === 'undefined') {
      console.error('NexoraDB not loaded');
      return false;
    }
    return true;
  }

  function getCurrentUser() {
    if (!ensureDB()) return null;
    return NexoraDB.getSession();
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  const SECURITY_QUESTIONS = {
    pet: 'What was the name of your first pet?',
    school: 'What primary school did you attend?',
    city: 'In which city were you born?',
    mother: "What is your mother's maiden name?",
    friend: 'What is the name of your best friend from childhood?'
  };

  function register(username, password, fullName, securityQ, securityA) {
    username = (username || '').trim().toLowerCase();
    fullName = (fullName || '').trim();
    securityQ = (securityQ || '').trim();
    securityA = (securityA || '').trim().toLowerCase();

    if (!username || !password || !fullName) {
      return { success: false, error: 'All fields are required' };
    }
    if (username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    if (!securityQ || !SECURITY_QUESTIONS[securityQ]) {
      return { success: false, error: 'Please select a security question' };
    }
    if (!securityA || securityA.length < 2) {
      return { success: false, error: 'Please enter a security answer' };
    }
    if (NexoraDB.findUser(username)) {
      return { success: false, error: 'Username already taken' };
    }

    const user = {
      username,
      password, // Note: In a real app this must be hashed on a server
      fullName,
      bio: '',
      avatarLetter: fullName.charAt(0).toUpperCase(),
      securityQ,
      securityA,
      createdAt: Date.now()
    };

    NexoraDB.saveUser(user);
    NexoraDB.setSession({
      username: user.username,
      fullName: user.fullName,
      bio: user.bio,
      avatarLetter: user.avatarLetter
    });

    return { success: true, user };
  }

  function login(username, password) {
    username = (username || '').trim().toLowerCase();
    const user = NexoraDB.findUser(username);

    if (!user || user.password !== password) {
      return { success: false, error: 'Invalid username or password' };
    }

    NexoraDB.setSession({
      username: user.username,
      fullName: user.fullName,
      bio: user.bio || '',
      avatarLetter: user.avatarLetter || user.fullName.charAt(0).toUpperCase()
    });

    return { success: true, user };
  }

  function logout() {
    NexoraDB.clearSession();
  }

  function getSecurityQuestion(username) {
    username = (username || '').trim().toLowerCase();
    const user = NexoraDB.findUser(username);
    if (!user || !user.securityQ) return { success: false, error: 'No security question found for this username' };
    return {
      success: true,
      question: SECURITY_QUESTIONS[user.securityQ] || 'Security question',
      key: user.securityQ
    };
  }

  function resetPasswordWithSecurity(username, answer, newPassword) {
    username = (username || '').trim().toLowerCase();
    answer = (answer || '').trim().toLowerCase();
    const user = NexoraDB.findUser(username);
    if (!user) return { success: false, error: 'Username not found' };
    if (!user.securityA) return { success: false, error: 'No security answer set for this account' };
    if (user.securityA !== answer) return { success: false, error: 'Incorrect security answer' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters' };
    }
    user.password = newPassword;
    NexoraDB.saveUser(user);
    return { success: true };
  }

  function setOnlineStatus(online) {
    const session = getCurrentUser();
    if (!session) return { success: false };
    const user = NexoraDB.findUser(session.username);
    if (!user) return { success: false };
    user.online = !!online;
    NexoraDB.saveUser(user);
    session.online = !!online;
    NexoraDB.setSession(session);
    return { success: true, online: !!online };
  }

  function changePassword(currentPassword, newPassword) {
    const session = getCurrentUser();
    if (!session) return { success: false, error: 'Not logged in' };
    const user = NexoraDB.findUser(session.username);
    if (!user) return { success: false, error: 'User not found' };
    if (user.password !== currentPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters' };
    }
    user.password = newPassword;
    NexoraDB.saveUser(user);
    return { success: true };
  }

  function deleteAccount(password) {
    const session = getCurrentUser();
    if (!session) return { success: false, error: 'Not logged in' };
    const user = NexoraDB.findUser(session.username);
    if (!user) return { success: false, error: 'User not found' };
    if (user.password !== password) {
      return { success: false, error: 'Password is incorrect' };
    }
    NexoraDB.removeUser(session.username);
    NexoraDB.clearSession();
    return { success: true };
  }

  function updateProfile({ fullName, bio }) {
    const session = getCurrentUser();
    if (!session) return { success: false, error: 'Not logged in' };

    const user = NexoraDB.findUser(session.username);
    if (!user) return { success: false, error: 'User not found' };

    if (fullName) {
      user.fullName = fullName.trim();
      user.avatarLetter = fullName.trim().charAt(0).toUpperCase();
    }
    if (bio !== undefined) {
      user.bio = bio.trim();
    }

    NexoraDB.saveUser(user);
    NexoraDB.setSession({
      username: user.username,
      fullName: user.fullName,
      bio: user.bio,
      avatarLetter: user.avatarLetter
    });

    return { success: true, user };
  }

  return {
    getCurrentUser,
    isLoggedIn,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    setOnlineStatus,
    getSecurityQuestion,
    resetPasswordWithSecurity,
    SECURITY_QUESTIONS
  };
})();
