/**
 * KipinQ — App glue logic
 * Exposes small global helpers and initializes page modules.
 */

window.showView = function (name, btn) {
  if (typeof UI !== 'undefined') {
    UI.showView(name);
  }
  if (btn && btn.classList) {
    if (btn.classList.contains('menu-item')) {
      if (typeof UI !== 'undefined') UI.setMenuActive(btn);
    }
  }
};

window.setActive = function (el) {
  if (typeof UI !== 'undefined') {
    UI.setMenuActive(el);
  }
};

window.likePost = function (btn) {
  if (!btn) return;
  btn.classList.toggle('liked');
  const countEl = btn.querySelector('.like-count');
  const current = parseInt(countEl?.textContent || '0', 10);
  if (countEl) {
    countEl.textContent = btn.classList.contains('liked') ? current + 1 : current - 1;
  }
};

window.commentPost = function () {
  if (typeof UI !== 'undefined') UI.showView('profile');
  setTimeout(() => {
    const commentInput = document.getElementById('pf-comment-input');
    if (commentInput) commentInput.focus();
  }, 100);
};

window.addComment = function () {
  if (typeof Profile !== 'undefined') Profile.addComment();
};

window.sendMessage = function () {
  if (typeof Messages !== 'undefined') Messages.send();
};

window.switchChat = function (name) {
  if (typeof Messages !== 'undefined') Messages.openConvo(name);
};

window.acceptFriend = function (btn) {
  if (!btn) return;
  btn.textContent = '✓ Friends!';
  btn.style.background = 'var(--online)';
  btn.style.color = '#000';
  btn.disabled = true;
};

window.updateMood = function (mood) {
  if (!mood) return;
  const moodEl = document.querySelector('.mood');
  if (moodEl) moodEl.textContent = mood;
};

window.addEventListener('DOMContentLoaded', async () => {
  // Check auth and load user profile
  if (typeof API !== 'undefined' && API.auth) {
    if (!API.auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    try {
      const data = await API.auth.me();
      const user = data.user;
      if (user && typeof AppState !== 'undefined') {
        // Sync API user to AppState for legacy UI components
        AppState.currentUser = {
          ...AppState.currentUser,
          ...user,
          name: user.username,
          stats: {
            friends: data.stats?.friends || 0,
            posts: data.stats?.posts || 0,
            views: 0,
            groups: 0
          }
        };
        
        // Update sidebar
        const sidebarUser = document.querySelector('.sidebar .username');
        if (sidebarUser) sidebarUser.textContent = user.username;
        
        const sidebarTag = document.querySelector('.sidebar .tagline');
        if (sidebarTag) sidebarTag.textContent = user.tagline || '';
        
        const sidebarAv = document.querySelector('.sidebar .avatar');
        if (sidebarAv) sidebarAv.textContent = user.emoji || '😎';
        
        const sidebarMood = document.querySelector('.sidebar .mood-display');
        if (sidebarMood) sidebarMood.textContent = user.mood || '😊 Happy';
      }
    } catch (err) {
      console.error('Auth error', err);
      if (typeof API !== 'undefined' && API.token) {
        API.token.remove();
      }
      window.location.href = 'login.html';
      return;
    }
  }

  if (typeof Feed     !== 'undefined') Feed.init();
  if (typeof Photos   !== 'undefined') Photos.init();
  if (typeof Player   !== 'undefined') Player.init();
  if (typeof Profile  !== 'undefined') Profile.init();
  if (typeof Messages !== 'undefined') Messages.init();
  if (typeof Settings !== 'undefined') Settings.init();
  if (typeof Groups   !== 'undefined') Groups.init();
  if (typeof Friends  !== 'undefined') Friends.init();

  // Render Groups
  if (typeof Groups !== 'undefined') Groups.renderGroups();

  // Update notification counts
  updateNotificationCounts();
});

function updateNotificationCounts() {
  // Messages count
  const unreadMessages = Object.values(AppState.conversations).filter(c => c.unread).length;
  const msgBtn = document.querySelector('[data-view="messages"] .notif-count');
  if (msgBtn) {
    msgBtn.textContent = unreadMessages;
    msgBtn.style.display = unreadMessages > 0 ? 'inline' : 'none';
  }
  const msgBadge = document.querySelector('[data-menu="messages"] .badge');
  if (msgBadge) {
    msgBadge.textContent = unreadMessages;
    msgBadge.style.display = unreadMessages > 0 ? 'inline' : 'none';
  }

  // Friends count (friend requests)
  const friendRequests = AppState.friendRequests.length;
  const friendsBtn = document.querySelector('[data-view="friends"] .notif-count');
  if (friendsBtn) {
    friendsBtn.textContent = friendRequests;
    friendsBtn.style.display = friendRequests > 0 ? 'inline' : 'none';
  }
  const friendsBadge = document.querySelector('[data-menu="friends"] .badge');
  if (friendsBadge) {
    friendsBadge.textContent = friendRequests;
    friendsBadge.style.display = friendRequests > 0 ? 'inline' : 'none';
  }
}