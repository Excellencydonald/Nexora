/* ============================================
   NEXORA Calls Module - V3.3
   Uses NexoraDB for call history
   ============================================ */

const NexoraCalls = (function () {
  let callState = null;
  let timerInterval = null;
  let seconds = 0;
  let currentContact = { name: 'Ada Okafor', letter: 'A' };

  function getHistory() {
    return NexoraDB.getCallHistory();
  }

  function addToHistory(entry) {
    NexoraDB.addCallRecord({
      id: Date.now(),
      ...entry,
      timestamp: Date.now()
    });
    renderHistory();
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function renderHistory() {
    const container = document.getElementById('call-history');
    if (!container) return;

    const history = getHistory();
    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px 20px;">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="1.8">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <h3>No calls yet</h3>
          <p>Use the buttons above to start a demo call</p>
        </div>`;
      return;
    }

    container.innerHTML = history.map(h => {
      const iconClass = h.type === 'missed' ? 'missed' : h.type === 'outgoing' ? 'outgoing' : 'incoming';
      const label = h.type === 'missed' ? 'Missed' : h.type === 'outgoing' ? 'Outgoing' : 'Incoming';
      return `
        <div class="call-history-item" data-name="${h.name}">
          <div class="chat-avatar" style="width:42px;height:42px;font-size:1rem;">${h.letter}</div>
          <div class="chat-info">
            <div class="chat-top">
              <span class="chat-name">${h.name}</span>
              <span class="chat-time">${formatTime(h.timestamp)}</span>
            </div>
            <div class="chat-bottom">
              <span class="chat-preview" style="display:flex;align-items:center;gap:4px;">
                <svg class="call-type-icon ${iconClass}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                ${label}${h.duration ? ' · ' + h.duration : ''}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.call-history-item').forEach(item => {
      item.addEventListener('click', () => {
        currentContact = { name: item.dataset.name, letter: item.dataset.name[0] };
        startOutgoing();
      });
    });
  }

  function showCallUI(state) {
    callState = state;
    document.querySelector('.app-header')?.classList.add('hidden');
    document.getElementById('bottom-nav')?.classList.add('hidden');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById('screen-call-ui');
    if (screen) {
      screen.classList.add('active');
      renderCallScreen();
    }
  }

  function hideCallUI(resultType = 'outgoing', durationStr = null) {
    if (callState === 'active' || callState === 'outgoing') {
      addToHistory({
        name: currentContact.name,
        letter: currentContact.letter,
        type: resultType,
        duration: durationStr
      });
    }
    callState = null;
    stopTimer();
    document.getElementById('screen-call-ui')?.classList.remove('active');
    document.querySelector('.app-header')?.classList.remove('hidden');
    document.getElementById('bottom-nav')?.classList.remove('hidden');
    if (window.NexoraApp) NexoraApp.switchScreen('calls');
    if (window.NexoraToast) NexoraToast.show('Call ended', 'info');
  }

  function startTimer() {
    seconds = 0;
    stopTimer();
    timerInterval = setInterval(() => {
      seconds++;
      const el = document.getElementById('call-timer');
      if (el) {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        el.textContent = `${m}:${s}`;
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function getDurationString() {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderCallScreen() {
    const container = document.getElementById('call-ui-content');
    if (!container) return;
    const name = currentContact.name;
    const letter = currentContact.letter;

    if (callState === 'incoming') {
      container.innerHTML = `
        <div class="call-screen">
          <div>
            <div class="call-avatar ringing">${letter}</div>
            <div class="call-name">${name}</div>
            <div class="call-status">Incoming voice call...</div>
          </div>
          <div class="call-controls">
            <div class="call-control-item">
              <button class="call-btn reject" id="btn-reject">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
              <span class="call-actions-label">Decline</span>
            </div>
            <div class="call-control-item">
              <button class="call-btn accept" id="btn-accept">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </button>
              <span class="call-actions-label">Accept</span>
            </div>
          </div>
        </div>`;
      document.getElementById('btn-reject')?.addEventListener('click', () => {
        addToHistory({ name, letter, type: 'missed' });
        hideCallUI('missed');
        if (window.NexoraToast) NexoraToast.show('Call declined', 'info');
      });
      document.getElementById('btn-accept')?.addEventListener('click', () => {
        callState = 'active';
        renderCallScreen();
        startTimer();
      });
    }

    if (callState === 'outgoing') {
      container.innerHTML = `
        <div class="call-screen">
          <div>
            <div class="call-avatar ringing">${letter}</div>
            <div class="call-name">${name}</div>
            <div class="call-status">Calling...</div>
          </div>
          <div class="call-controls">
            <div class="call-control-item">
              <button class="call-btn end" id="btn-end">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
              <span class="call-actions-label">Cancel</span>
            </div>
          </div>
        </div>`;
      document.getElementById('btn-end')?.addEventListener('click', () => hideCallUI('outgoing'));
      setTimeout(() => {
        if (callState === 'outgoing') {
          callState = 'active';
          renderCallScreen();
          startTimer();
        }
      }, 2800);
    }

    if (callState === 'active') {
      container.innerHTML = `
        <div class="call-screen">
          <div>
            <div class="call-avatar">${letter}</div>
            <div class="call-name">${name}</div>
            <div class="call-status">Voice call</div>
            <div class="call-timer" id="call-timer">00:00</div>
          </div>
          <div class="call-controls">
            <div class="call-control-item">
              <button class="call-btn mute" id="btn-mute">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
              <span class="call-actions-label">Mute</span>
            </div>
            <div class="call-control-item">
              <button class="call-btn speaker" id="btn-speaker">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              </button>
              <span class="call-actions-label">Speaker</span>
            </div>
            <div class="call-control-item">
              <button class="call-btn end" id="btn-end">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
              <span class="call-actions-label">End</span>
            </div>
          </div>
        </div>`;
      document.getElementById('btn-end')?.addEventListener('click', () => {
        hideCallUI('outgoing', getDurationString());
      });
      document.getElementById('btn-mute')?.addEventListener('click', function () {
        this.classList.toggle('active');
        if (window.NexoraToast) NexoraToast.show(this.classList.contains('active') ? 'Microphone muted' : 'Microphone unmuted', 'info', 1500);
      });
      const el = document.getElementById('call-timer');
      if (el) {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        el.textContent = `${m}:${s}`;
      }
    }
  }

  function startOutgoing() {
    showCallUI('outgoing');
  }

  function startIncoming() {
    currentContact = { name: 'Ada Okafor', letter: 'A' };
    showCallUI('incoming');
  }

  function init() {
    renderHistory();
    document.getElementById('demo-outgoing')?.addEventListener('click', () => {
      currentContact = { name: 'Ada Okafor', letter: 'A' };
      startOutgoing();
    });
    document.getElementById('demo-incoming')?.addEventListener('click', startIncoming);
  }

  return { init, startOutgoing, startIncoming, hideCallUI, renderHistory };
})();
