/* ============================================
   NEXORA AI Module - V3.6
   Real AI ready + strong local fallback
   ============================================ */

const NexoraAI = (function () {
  const STORAGE_KEY = 'nexora_ai_conversations';
  const CURRENT_KEY = 'nexora_ai_current_id';

  // ========== CONFIGURATION ==========
  // Set this to your Cloudflare Worker URL after you deploy it.
  // Example: 'https://nexora-ai.yourname.workers.dev'
  // Leave empty ('') to use local demo mode.
  const REAL_AI_ENDPOINT = '';   // ← put your Worker URL here

  // Optional: simple shared secret (set the same value in the Worker)
  const AI_SECRET = '';          // leave empty if not using

  let conversations = {};
  let currentId = null;
  let isGenerating = false;
  let messagesEl, inputEl, sendBtn, welcomeEl, statusEl;

  // ---------- Storage ----------
  function load() {
    try {
      if (window.NexoraDB) {
        conversations = NexoraDB.getAIConversations() || {};
      } else {
        conversations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      }
      currentId = localStorage.getItem(CURRENT_KEY);
      if (!currentId || !conversations[currentId]) {
        createNewConversation(false);
      }
    } catch (e) {
      conversations = {};
      createNewConversation(false);
    }
  }

  function save() {
    if (window.NexoraDB) {
      NexoraDB.saveAIConversations(conversations);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
    localStorage.setItem(CURRENT_KEY, currentId);
  }

  function createNewConversation(render = true) {
    const id = 'conv_' + Date.now();
    conversations[id] = {
      id,
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    currentId = id;
    save();
    if (render) renderMessages();
    return id;
  }

  function getCurrent() {
    return conversations[currentId];
  }

  // ---------- Rendering ----------
  function renderMessages() {
    if (!messagesEl) return;
    const conv = getCurrent();
    messagesEl.innerHTML = '';

    if (!conv || conv.messages.length === 0) {
      if (welcomeEl) {
        messagesEl.appendChild(welcomeEl);
        welcomeEl.classList.remove('hidden');
      }
      return;
    }

    if (welcomeEl) welcomeEl.classList.add('hidden');

    conv.messages.forEach((msg) => {
      const div = document.createElement('div');
      div.className = `message ${msg.role}`;
      const time = new Date(msg.timestamp).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit'
      });

      let metaHtml = `<div class="message-meta"><span>${time}</span>`;
      if (msg.role === 'ai') {
        metaHtml += `<button class="copy-btn" data-text="${escapeHtml(msg.content)}">Copy</button>`;
      }
      metaHtml += `</div>`;

      div.innerHTML = `
        <div class="bubble">${formatContent(msg.content)}</div>
        ${metaHtml}
      `;
      messagesEl.appendChild(div);
    });

    messagesEl.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.text).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = 'Copy'), 1500);
        });
      });
    });

    scrollToBottom();
  }

  function formatContent(text) {
    return escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.3);padding:2px 5px;border-radius:4px;font-size:0.9em">$1</code>')
      .replace(/\n/g, '<br>');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function scrollToBottom() {
    if (messagesEl) {
      requestAnimationFrame(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    }
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'message ai';
    typing.id = 'typing-indicator';
    typing.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    document.getElementById('typing-indicator')?.remove();
  }

  function updateStatus(text, isReal = false) {
    if (statusEl) {
      statusEl.textContent = text;
      statusEl.style.color = isReal ? 'var(--success)' : '';
    }
  }

  // ---------- AI Generation ----------
  async function generateResponse(userMessage, history) {
    // Try real endpoint first
    if (REAL_AI_ENDPOINT && REAL_AI_ENDPOINT.startsWith('http')) {
      try {
        const response = await fetch(REAL_AI_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(AI_SECRET ? { 'X-Nexora-Secret': AI_SECRET } : {})
          },
          body: JSON.stringify({
            message: userMessage,
            history: history.slice(-12) // last 12 messages for context
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (data.reply) {
          updateStatus('Online • Real AI', true);
          return data.reply;
        }
        throw new Error('No reply in response');
      } catch (err) {
        console.warn('Real AI failed, falling back to demo:', err);
        updateStatus('Online • Demo mode (API error)');
        if (window.NexoraToast) {
          NexoraToast.show('AI service unavailable – using demo mode', 'error', 3000);
        }
      }
    }

    // ----- Local high-quality fallback -----
    return localGenerate(userMessage);
  }

  async function localGenerate(userMessage) {
    await delay(450 + Math.random() * 600);
    const lower = userMessage.toLowerCase().trim();
    const original = userMessage.trim();

    // Greetings
    if (/^(hi|hello|hey|hiya|good morning|good afternoon|good evening|howdy)/.test(lower)) {
      const greetings = [
        "Hey! I'm **NEXORA AI** — ready to help you write, learn, create or just think things through.\n\nWhat do you need?",
        "Hi there! What can I help you with today — writing, ideas, explanations, or something else?",
        "Hello! I'm here for messages, captions, studying help, brainstorming and more. What's on your mind?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Identity
    if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('your name')) {
      return "I'm **NEXORA AI**, your built-in assistant inside the NEXORA app.\n\nI can help you:\n• Write messages, captions and emails\n• Explain topics step-by-step\n• Brainstorm ideas and content\n• Summarise text\n• Translate short passages\n\nJust talk to me normally!";
    }

    // Writing help
    if (/(write|draft|compose|make|create)/.test(lower) && /(message|text|email|caption|letter|post|bio|story)/.test(lower)) {
      return "I can write that for you.\n\nQuick details please:\n1. **What** is it? (message, Instagram caption, email, bio, etc.)\n2. **Tone** — friendly, professional, casual, funny, flirty?\n3. Any **key points** I must include?\n\nSend me those and I’ll give you a polished version.";
    }

    if (lower.startsWith('write ') || lower.startsWith('draft ') || lower.includes('help me write')) {
      return "Sure — I can write it.\n\nTell me the type of text and the tone you want, plus any important points. The more detail you give, the better the result.";
    }

    // Explain / Study
    if (/(explain|what is|what are|how does|how do|teach me|help me understand)/.test(lower)) {
      return "I can explain it clearly.\n\nJust tell me:\n• The topic or question\n• How deep you want the explanation (simple / normal / detailed)\n\nI’ll break it down step by step.";
    }

    // Summarise
    if (/(summar|tldr|shorten|condense)/.test(lower)) {
      return "Paste the text you want summarised.\n\nAlso tell me the style you prefer:\n• One sentence\n• Short paragraph\n• Bullet points\n\nThen I’ll do it.";
    }

    // Translate
    if (/(translate|in spanish|in french|in yoruba|in hausa|in igbo|in german|in arabic)/.test(lower)) {
      return "I can help with translation.\n\nSend me:\n1. The text\n2. The target language\n\nExample: “Translate to Yoruba: Good morning, how are you?”";
    }

    // Brainstorm / Ideas
    if (/(idea|brainstorm|suggest|recommend|give me|come up with)/.test(lower)) {
      return "Let’s brainstorm.\n\nWhat do you need ideas for?\n• Captions / social posts\n• Story or video concepts\n• App or business ideas\n• Names\n• Something else?\n\nTell me the topic and any constraints (tone, length, platform…).";
    }

    // Motivation
    if (/(motivat|inspire|encourage|feeling down|sad|stressed|advice)/.test(lower)) {
      return "I’m here for you.\n\nWant a short motivational message, practical advice, or just someone to help you think through what’s going on? Tell me a bit more and I’ll respond accordingly.";
    }

    // Help
    if (lower === 'help' || lower === 'menu' || lower.includes('what can you do') || lower.includes('your capabilities')) {
      return "Here’s what I’m good at:\n\n**Writing**\nMessages, captions, emails, bios, short stories\n\n**Learning**\nClear explanations and study help\n\n**Creative**\nBrainstorming ideas, concepts, names\n\n**Utility**\nSummaries and light translation\n\nJust type what you need in normal language — no special commands required.";
    }

    // Thanks
    if (/(thank|thanks|thx|appreciate)/.test(lower)) {
      return "You’re welcome! Glad I could help.\n\nAnything else you need?";
    }

    // Default
    return `Got it: “${original}”\n\nI can help with this. To give you the best answer, could you tell me a bit more about what you want?\n\nFor example:\n• Should I write something?\n• Explain a topic?\n• Give ideas?\n• Summarise or translate?\n\nJust clarify and I’ll get to work.`;
  }

  function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  // ---------- Public API ----------
  async function sendMessage(text) {
    if (!text || !text.trim() || isGenerating) return;

    const conv = getCurrent();
    if (!conv) return;

    if (welcomeEl) welcomeEl.classList.add('hidden');

    const userMsg = {
      role: 'user',
      content: text.trim(),
      timestamp: Date.now()
    };
    conv.messages.push(userMsg);
    conv.updatedAt = Date.now();
    if (conv.messages.length === 1) {
      conv.title = text.trim().slice(0, 40) + (text.length > 40 ? '…' : '');
    }
    save();
    renderMessages();

    if (inputEl) {
      inputEl.value = '';
      inputEl.style.height = 'auto';
    }

    isGenerating = true;
    updateSendButton();
    showTyping();

    try {
      // Build history for context
      const history = conv.messages
        .filter(m => m.role === 'user' || m.role === 'ai')
        .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content }));

      const reply = await generateResponse(text.trim(), history);
      hideTyping();

      conv.messages.push({
        role: 'ai',
        content: reply,
        timestamp: Date.now()
      });
      conv.updatedAt = Date.now();
      save();
      renderMessages();
    } catch (err) {
      hideTyping();
      conv.messages.push({
        role: 'ai',
        content: 'Sorry, something went wrong while generating a response. Please try again.',
        timestamp: Date.now()
      });
      save();
      renderMessages();
    } finally {
      isGenerating = false;
      updateSendButton();
    }
  }

  function updateSendButton() {
    if (sendBtn) {
      sendBtn.disabled = isGenerating || !(inputEl && inputEl.value.trim());
    }
  }

  function clearCurrentChat() {
    if (!currentId) return;
    if (confirm('Clear this conversation?')) {
      conversations[currentId].messages = [];
      conversations[currentId].title = 'New conversation';
      save();
      renderMessages();
    }
  }

  function newChat() {
    createNewConversation(true);
  }

  function init() {
    messagesEl = document.getElementById('ai-messages');
    inputEl = document.getElementById('ai-input');
    sendBtn = document.getElementById('ai-send-btn');
    welcomeEl = document.getElementById('ai-welcome');
    statusEl = document.querySelector('.ai-status');

    if (!messagesEl || !inputEl || !sendBtn) {
      console.warn('NEXORA AI: Required DOM elements not found');
      return;
    }

    load();
    renderMessages();

    // Status
    if (REAL_AI_ENDPOINT && REAL_AI_ENDPOINT.startsWith('http')) {
      updateStatus('Online • Real AI', true);
    } else {
      updateStatus('Online • Local mode');
    }

    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
      updateSendButton();
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputEl.value);
      }
    });

    sendBtn.addEventListener('click', () => sendMessage(inputEl.value));

    document.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.prompt || chip.textContent;
        sendMessage(text);
      });
    });

    document.getElementById('ai-new-chat')?.addEventListener('click', newChat);
    document.getElementById('ai-clear-chat')?.addEventListener('click', clearCurrentChat);

    updateSendButton();
  }

  return { init, sendMessage, newChat, clearCurrentChat };
})();
