/**
 * KipinQ — Messages Module
 */

const Messages = {
  activePartner: null,

  init() {
    this.renderLayout();
    this.loadConversations();
    this.bindSocketEvents();
  },

  bindSocketEvents() {
    window.addEventListener('fs:message:receive', (e) => {
      const msg = e.detail;
      if (this.activePartner === msg.sender_id) {
        this.appendMessageToHistory(msg);
        API.messages.markRead(msg.sender_id);
      }
      this.loadConversations();
    });

    window.addEventListener('fs:message:sent', (e) => {
      const msg = e.detail;
      if (this.activePartner === msg.receiver_id) {
        // We already optimistically appended it, but could replace temp ID here
      }
      this.loadConversations();
    });
  },

  appendMessageToHistory(m) {
    const history = document.getElementById('chat-history');
    if (!history) return;

    if (history.querySelector('div[style*="margin:auto"]')) {
      history.innerHTML = '';
    }

    const isMe = m.from_me || m.sender_id === AppState.currentUser.id;
    history.innerHTML += `
      <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:10px;">
        <div style="max-width:70%; padding:10px 15px; border-radius:15px; ${isMe ? 'background:var(--primary); color:#fff; border-bottom-right-radius:5px;' : 'background:var(--surface); border-bottom-left-radius:5px;'}">
          ${m.text}
        </div>
      </div>
    `;
    history.scrollTop = history.scrollHeight;
  },

  renderLayout() {
    const view = document.getElementById('view-messages');
    if (!view) return;

    view.innerHTML = `
      <div class="messages-layout" style="display:flex; height:100%; min-height:600px;">
        <div class="messages-sidebar" style="width:300px; border-right:1px solid var(--border); background:var(--surface);">
          <div style="padding:20px; font-weight:bold; font-size:18px; border-bottom:1px solid var(--border);">
            Inbox
          </div>
          <div id="conversations-list" style="overflow-y:auto; height:calc(100% - 60px);">
            <div style="padding:20px; color:var(--muted);">Loading...</div>
          </div>
        </div>
        
        <div class="messages-main" style="flex:1; display:flex; flex-direction:column; background:var(--surface2);">
          <div id="chat-header" style="padding:20px; border-bottom:1px solid var(--border); display:none; align-items:center; background:var(--surface);">
            <div id="chat-header-emoji" style="font-size:24px; margin-right:15px;"></div>
            <div>
              <div id="chat-header-name" style="font-weight:bold; font-size:16px;"></div>
              <div id="chat-header-status" style="font-size:12px; color:var(--muted);"></div>
            </div>
          </div>
          
          <div id="chat-history" style="flex:1; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
            <div style="margin:auto; color:var(--muted);">Select a conversation to start chatting.</div>
          </div>
          
          <div id="chat-input-area" style="padding:20px; border-top:1px solid var(--border); display:none; background:var(--surface);">
            <div style="display:flex; gap:10px;">
              <input type="text" id="chat-input" class="input" placeholder="Type a message..." style="flex:1;" onkeydown="if(event.key==='Enter') Messages.send()">
              <button class="btn btn-primary" onclick="Messages.send()">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async loadConversations() {
    const list = document.getElementById('conversations-list');
    if (!list) return;

    try {
      const res = await API.messages.inbox();
      const convos = res.conversations || [];
      const unreadCount = convos.reduce((sum, c) => sum + (c.unread ? 1 : 0), 0);
      const msgBtn = document.querySelector('[data-view="messages"] .notif-count');
      if (msgBtn) {
        msgBtn.textContent = unreadCount;
        msgBtn.style.display = unreadCount > 0 ? 'inline' : 'none';
      }
      const msgBadge = document.querySelector('[data-menu="messages"] .badge');
      if (msgBadge) {
        msgBadge.textContent = unreadCount;
        msgBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
      }

      if (convos.length === 0) {
        list.innerHTML = `<div style="padding:20px; color:var(--muted);">No conversations yet.</div>`;
        return;
      }

      list.innerHTML = convos.map(c => `
        <div class="convo-item" onclick="Messages.openConvo('${c.other_user_id}', '${c.username}', '${c.emoji}', '${c.user_status}')" style="display:flex; padding:15px; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.2s;">
          <div style="font-size:24px; margin-right:15px;">${c.emoji || '😎'}</div>
          <div style="flex:1; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
              <span style="font-weight:bold;">${c.username}</span>
            </div>
            <div style="color:var(--muted); font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${c.last_message || ''}
            </div>
          </div>
        </div>
      `).join('');
      
    } catch (err) {
      console.error(err);
      list.innerHTML = `<div style="padding:20px; color:var(--danger);">Failed to load inbox.</div>`;
    }
  },

  async openConvo(uid, username, emoji, status) {
    this.activePartner = uid;
    
    document.getElementById('chat-header').style.display = 'flex';
    document.getElementById('chat-input-area').style.display = 'block';
    
    if (username) document.getElementById('chat-header-name').textContent = username;
    if (emoji) document.getElementById('chat-header-emoji').textContent = emoji;
    if (status) document.getElementById('chat-header-status').textContent = status;

    const history = document.getElementById('chat-history');
    history.innerHTML = `<div style="margin:auto; color:var(--muted);">Loading messages...</div>`;

    try {
      const res = await API.messages.history(uid);
      const messages = res.messages || [];

      if (messages.length === 0) {
        history.innerHTML = `<div style="margin:auto; color:var(--muted);">Say hi to start the conversation!</div>`;
      } else {
        history.innerHTML = messages.map(m => {
          const isMe = m.from_me || m.sender_id === AppState.currentUser.id;
          return `
            <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; margin-bottom:10px;">
              <div style="max-width:70%; padding:10px 15px; border-radius:15px; ${isMe ? 'background:var(--primary); color:#fff; border-bottom-right-radius:5px;' : 'background:var(--surface); border-bottom-left-radius:5px;'}">
                ${m.text}
              </div>
            </div>
          `;
        }).join('');
        history.scrollTop = history.scrollHeight;
      }
      
      API.messages.markRead(uid);
    } catch (err) {
      console.error(err);
      history.innerHTML = `<div style="margin:auto; color:var(--danger);">Failed to load messages.</div>`;
    }
  },

  async send() {
    if (!this.activePartner) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    // Optimistically render
    const history = document.getElementById('chat-history');
    if (history.querySelector('div[style*="margin:auto"]')) {
      history.innerHTML = ''; // clear empty state
    }

    history.innerHTML += `
      <div style="display:flex; flex-direction:column; align-items:flex-end; margin-bottom:10px; opacity:0.7;">
        <div style="max-width:70%; padding:10px 15px; border-radius:15px; background:var(--primary); color:#fff; border-bottom-right-radius:5px;">
          ${text}
        </div>
      </div>
    `;
    history.scrollTop = history.scrollHeight;

    try {
      await API.messages.send(this.activePartner, text);
      // Reload history to ensure it's synced
      this.openConvo(this.activePartner);
      this.loadConversations();
    } catch (err) {
      UI.toast('Failed to send message', 'danger');
    }
  }
};