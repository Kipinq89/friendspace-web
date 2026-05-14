/**
 * KipinQ — Notifications View Logic
 */

const Notifications = {
  async init() {
    await this.loadNotifications();
  },

  async loadNotifications() {
    if (typeof API === 'undefined' || typeof API.notifications === 'undefined') {
      console.error('Notification API missing', { API });
      UI.toast('Notification service unavailable', 'error');
      return;
    }

    try {
      const data = await API.notifications.getAll();
      this.render(data.notifications);
      
      // Update badge
      const badge = document.getElementById('nav-notif-badge');
      if (badge) {
        badge.textContent = data.unread;
        badge.style.display = data.unread > 0 ? 'inline' : 'none';
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
      UI.toast('Failed to load notifications', 'error');
    }
  },

  render(notifs) {
    const list = document.getElementById('notifications-list');
    const btnReadAll = document.getElementById('btn-read-all-notifs');
    if (!list) return;

    if (!notifs || notifs.length === 0) {
      list.innerHTML = `<div style="text-align:center;color:var(--muted);padding:20px;">No new notifications</div>`;
      if (btnReadAll) btnReadAll.style.display = 'none';
      return;
    }

    // Sort by newest first
    notifs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    let html = '';
    let hasUnread = false;

    notifs.forEach(n => {
      const date = new Date(n.created_at);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
      const isUnread = n.read === 0;
      if (isUnread) hasUnread = true;

      // Icon logic
      let icon = '🔔';
      let bgColor = 'var(--surface2)';
      let glow = '';

      if (n.type === 'message') {
        icon = '💬';
        if (isUnread) {
          bgColor = 'rgba(0,229,255,0.1)';
          glow = 'border-left: 3px solid #00E5FF;';
        }
      } else if (n.type === 'friend') {
        icon = '👥';
        if (isUnread) {
          bgColor = 'rgba(168,85,247,0.1)';
          glow = 'border-left: 3px solid #a855f7;';
        }
      } else if (n.type === 'post') {
        icon = '📝';
        if (isUnread) {
          bgColor = 'rgba(255,107,157,0.1)';
          glow = 'border-left: 3px solid #FF6B9D;';
        }
      } else {
        if (isUnread) {
          bgColor = 'var(--surface3)';
          glow = 'border-left: 3px solid var(--text);';
        }
      }

      html += `
        <div style="display:flex; align-items:center; gap:12px; padding:12px; background:${bgColor}; border-radius:8px; border:1px solid var(--border); ${glow}">
          <div style="font-size:24px;">${icon}</div>
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:${isUnread ? '800' : '600'}; color:var(--text); margin-bottom:4px;">
              ${UI.escapeHTML(n.text)}
            </div>
            <div style="font-size:10px; color:var(--muted);">${UI.escapeHTML(timeStr)}</div>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
    if (btnReadAll) btnReadAll.style.display = hasUnread ? 'block' : 'none';
  },

  async readAll() {
    try {
      await API.notifications.markAllRead();
      UI.toast('Notifications marked as read', 'success');
      await this.loadNotifications();
      
      // Update global user stats if available
      if (AppState.currentUser && AppState.currentUser.stats) {
        // We do not have direct unreadNotifications stat exposed globally right now
        // But we can reset the badge manually
        const badge = document.getElementById('nav-notif-badge');
        if (badge) {
          badge.style.display = 'none';
          badge.textContent = '0';
        }
      }
    } catch (err) {
      console.error(err);
      UI.toast('Failed to mark read', 'error');
    }
  }
};
