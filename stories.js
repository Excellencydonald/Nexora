/* ============================================
   NEXORA Stories Module - V3.2
   Now using the structured NexoraDB layer
   ============================================ */

const NexoraStories = (function () {

  function getStories() {
    return NexoraDB.getStories();
  }

  function addStory(text) {
    if (!text || !text.trim()) return null;
    const user = NexoraAuth.getCurrentUser();
    if (!user) return null;

    const story = {
      id: 'story_' + Date.now(),
      text: text.trim().slice(0, 500),
      author: user.fullName,
      username: user.username,
      avatarLetter: user.avatarLetter || user.fullName[0],
      createdAt: Date.now()
    };

    NexoraDB.addStory(story);
    return story;
  }

  function deleteStory(id) {
    const stories = getStories().filter(s => s.id !== id);
    NexoraDB.saveStories(stories);
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    return 'Expired';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render() {
    const container = document.getElementById('stories-list');
    if (!container) return;

    const stories = getStories();
    const currentUser = NexoraAuth.getCurrentUser();

    let html = `
      <div class="story-card your-story" id="btn-add-story">
        <div class="story-avatar add">+</div>
        <div class="story-info">
          <div class="story-author">Your Story</div>
          <div class="story-time">Tap to add a text story</div>
        </div>
      </div>
    `;

    if (stories.length === 0) {
      html += `
        <div class="empty-state" style="padding:40px 20px;">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="1.8">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <h3>No stories yet</h3>
          <p>Tap “Your Story” above to share something. Stories disappear after 24 hours.</p>
        </div>`;
    } else {
      stories.forEach(s => {
        const isMine = currentUser && s.username === currentUser.username;
        html += `
          <div class="story-card" data-id="${s.id}">
            <div class="story-avatar">${s.avatarLetter}</div>
            <div class="story-info">
              <div class="story-author">${escapeHtml(s.author)} ${isMine ? '<span class="you-badge">You</span>' : ''}</div>
              <div class="story-text">${escapeHtml(s.text)}</div>
              <div class="story-time">${timeAgo(s.createdAt)}</div>
            </div>
            ${isMine ? `<button class="story-delete" data-id="${s.id}" title="Delete">×</button>` : ''}
          </div>
        `;
      });
    }

    container.innerHTML = html;

    document.getElementById('btn-add-story')?.addEventListener('click', openModal);

    container.querySelectorAll('.story-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this story?')) {
          deleteStory(btn.dataset.id);
          render();
        }
      });
    });
  }

  function openModal() {
    const overlay = document.getElementById('story-modal');
    const textarea = document.getElementById('story-text-input');
    if (overlay && textarea) {
      textarea.value = '';
      overlay.classList.add('active');
      setTimeout(() => textarea.focus(), 100);
    }
  }

  function closeModal() {
    document.getElementById('story-modal')?.classList.remove('active');
  }

  function submitStory() {
    const textarea = document.getElementById('story-text-input');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) {
      if (window.NexoraToast) NexoraToast.show('Please write something first', 'error');
      return;
    }
    addStory(text);
    closeModal();
    render();
    if (window.NexoraToast) NexoraToast.show('Story posted', 'success');
  }

  function init() {
    render();

    document.getElementById('story-modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('story-modal-post')?.addEventListener('click', submitStory);

    document.getElementById('story-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'story-modal') closeModal();
    });
  }

  return { init, render, addStory, openModal, closeModal };
})();
