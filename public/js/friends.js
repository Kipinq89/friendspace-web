/**
 * KipinQ — Friends Module
 */

const Friends = {
  init() {
    this.render();
  },

  async render() {
    const view = document.getElementById('view-friends');
    if (!view) return;

    view.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);">Loading friends...</div>';

    try {
      const res = await API.friends.list();
      const friends = res.friends || [];
      const requests = res.requests || [];
      
      // Update AppState for notification counts and online sidebar
      AppState.friendRequests = requests;
      AppState.friends = friends;
      if (typeof updateNotificationCounts === 'function') {
        updateNotificationCounts();
      }
      if (typeof Feed !== 'undefined' && typeof Feed.renderOnlineNow === 'function') {
        Feed.renderOnlineNow();
      }

      let html = `<div class="friends-container" style="padding:20px; max-width:900px; margin:0 auto;">
        <h2 style="margin-bottom:20px;">👥 Friends</h2>`;

      // Friend Requests Section
      if (requests.length > 0) {
        html += `<div class="friend-requests" style="background:var(--surface); padding:20px; border-radius:12px; margin-bottom:30px;">
          <h3 style="margin-top:0; margin-bottom:15px; color:var(--primary);">Pending Requests (${requests.length})</h3>
          <div style="display:flex; flex-direction:column; gap:10px;">`;
        requests.forEach(r => {
          html += `<div class="friend-item" style="display:flex; align-items:center; background:rgba(0,0,0,0.2); padding:12px 15px; border-radius:8px;">
            <div style="font-size:32px; margin-right:15px;">${r.emoji || '😎'}</div>
            <div style="flex:1;">
              <div style="font-weight:bold; font-size:16px;">${r.username}</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn btn-primary btn-sm" onclick="Friends.acceptRequest('${r.request_id}')">Accept</button>
              <button class="btn btn-ghost btn-sm" onclick="Friends.declineRequest('${r.request_id}')">Decline</button>
            </div>
          </div>`;
        });
        html += `</div></div>`;
      }

      // Add Friend Section
      html += `<div class="add-friend-section" style="background:var(--surface); padding:20px; border-radius:12px; margin-bottom:30px;">
        <h3 style="margin-top:0; margin-bottom:15px;">Add Friend</h3>
        <div style="display:flex; gap:10px;">
          <input type="text" id="add-friend-input" class="input" placeholder="Enter username..." style="flex:1;">
          <button class="btn btn-primary" onclick="Friends.sendRequest()">Send Request</button>
        </div>
      </div>`;

      // My Friends Section
      html += `<div class="friends-list">
        <h3 style="margin-bottom:15px;">My Friends (${friends.length})</h3>`;
      
      if (friends.length === 0) {
        html += `<p style="color:var(--muted); text-align:center; padding:30px; background:var(--surface); border-radius:12px;">You have no friends yet. Add some!</p>`;
      } else {
        html += `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:20px;">`;
        friends.forEach(f => {
          html += `<div class="friend-card" style="background:var(--surface); padding:20px; border-radius:12px; text-align:center; transition:transform 0.2s;">
            <div style="font-size:48px; margin-bottom:15px;">${f.emoji || '😎'}</div>
            <div style="font-weight:bold; font-size:18px; margin-bottom:5px;">${f.username}</div>
            <div style="color:var(--muted); font-size:13px; margin-bottom:15px; height:20px;">${f.user_status || ''}</div>
            <div style="display:flex; justify-content:center; gap:10px;">
              <button class="btn btn-primary btn-sm" onclick="window.switchChat('${f.id}')">Message</button>
              <button class="btn btn-ghost btn-sm" onclick="Friends.removeFriend('${f.id}', '${f.username}')" title="Remove Friend">×</button>
            </div>
          </div>`;
        });
        html += `</div>`;
      }

      html += `</div></div>`;
      view.innerHTML = html;
      
    } catch (err) {
      console.error(err);
      view.innerHTML = `<div style="padding:20px;color:var(--danger);text-align:center;">Failed to load friends.</div>`;
    }
  },

  async sendRequest() {
    const input = document.getElementById('add-friend-input');
    if (!input) return;
    const username = input.value.trim();
    if (!username) return;

    try {
      await API.friends.sendRequest(username);
      input.value = '';
      UI.toast(`Friend request sent to ${username}!`, 'success');
      this.render();
    } catch (err) {
      UI.toast(err.message || 'Failed to send request', 'danger');
    }
  },

  async acceptRequest(reqId) {
    try {
      await API.friends.accept(reqId);
      UI.toast('Friend request accepted!', 'success');
      this.render();
    } catch (err) {
      UI.toast('Failed to accept request', 'danger');
    }
  },

  async declineRequest(reqId) {
    try {
      await API.friends.decline(reqId);
      UI.toast('Friend request declined.', 'info');
      this.render();
    } catch (err) {
      UI.toast('Failed to decline request', 'danger');
    }
  },

  async removeFriend(friendId, username) {
    if (!confirm(`Are you sure you want to remove ${username} from your friends?`)) return;
    // We are reusing decline API for removing a friendship by friendId or reqId
    try {
      await API.friends.remove(friendId);
      UI.toast('Friend removed.', 'info');
      this.render();
    } catch (err) {
      UI.toast('Failed to remove friend', 'danger');
    }
  }
};