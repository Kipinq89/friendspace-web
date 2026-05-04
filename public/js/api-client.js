/**
 * FriendSpace — API Client (frontend)
 * Drop this file into your js/ folder and load it before other modules.
 *
 * Usage:
 *   const posts = await API.posts.getFeed();
 *   const { token, user } = await API.auth.login(email, password);
 *   API.socket.send({ to: userId, text: 'hello!' });
 */

const API = (() => {

  // ── Config ────────────────────────────────
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
  const BASE_URL    = isLocalHost ? 'http://localhost:3000/api' : `${window.location.origin}/api`;
  const SOCKET_URL  = isLocalHost ? 'http://localhost:3000'     : window.location.origin;

  // ── Token storage ─────────────────────────
  const Token = {
    get:    ()    => localStorage.getItem('fs_token'),
    set:    (t)   => localStorage.setItem('fs_token', t),
    remove: ()    => localStorage.removeItem('fs_token'),
  };

  // ── Base fetch wrapper ────────────────────
  async function request(method, path, body = null, isFormData = false) {
    const headers = {};
    const token   = Token.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const options = { method, headers };
    if (body && method !== 'GET') {
      options.body = isFormData ? body : JSON.stringify(body);
    }

    const res  = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Auto-redirect to login on 401
      if (res.status === 401) {
        Token.remove();
        Auth._currentUser = null;
        window.dispatchEvent(new CustomEvent('fs:unauthorized'));
      }
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    return data;
  }

  const get    = (path)         => request('GET',    path);
  const post   = (path, body)   => request('POST',   path, body);
  const patch  = (path, body)   => request('PATCH',  path, body);
  const del    = (path)         => request('DELETE',  path);

  // ════════════════════════════════════════
  //  AUTH
  // ════════════════════════════════════════
  const Auth = {
    _currentUser: null,

    async register(username, email, password) {
      const data = await post('/auth/register', { username, email, password });
      Token.set(data.token);
      Auth._currentUser = data.user;
      Socket.connect(data.token);
      return data;
    },

    async login(email, password) {
      const data = await post('/auth/login', { email, password });
      Token.set(data.token);
      Auth._currentUser = data.user;
      Socket.connect(data.token);
      return data;
    },

    async me() {
      const data = await get('/auth/me');
      Auth._currentUser = data.user;
      return data;
    },

    async updateProfile(fields) {
      const data = await patch('/auth/me', fields);
      Auth._currentUser = data.user;
      return data;
    },

    async logout() {
      try { await post('/auth/logout'); } catch (_) {}
      Token.remove();
      Auth._currentUser = null;
      Socket.disconnect();
      window.location.href = 'login.html';
    },

    isLoggedIn: () => !!Token.get(),
    getUser:    () => Auth._currentUser,
  };

  // ════════════════════════════════════════
  //  POSTS
  // ════════════════════════════════════════
  const Posts = {
    getFeed:       (limit = 20, offset = 0) => get(`/posts?limit=${limit}&offset=${offset}`),
    create:        (body)    => post('/posts', body),
    delete:        (id)      => del(`/posts/${id}`),
    toggleLike:    (id)      => post(`/posts/${id}/like`),
    getComments:   (id)      => get(`/posts/${id}/comments`),
    addComment:    (id, text) => post(`/posts/${id}/comments`, { text }),
    deleteComment: (postId, commentId) => del(`/posts/${postId}/comments/${commentId}`),
    likeComment:   (postId, commentId) => post(`/posts/${postId}/comments/${commentId}/like`),
  };

  // ════════════════════════════════════════
  //  FRIENDS
  // ════════════════════════════════════════
  const Friends = {
    list:          ()         => get('/friends'),
    sendRequest:   (userId)   => post(`/friends/request/${userId}`),
    accept:        (userId)   => post(`/friends/accept/${userId}`),
    decline:       (userId)   => post(`/friends/decline/${userId}`),
    remove:        (userId)   => del(`/friends/${userId}`),
  };

  // ════════════════════════════════════════
  //  MESSAGES
  // ════════════════════════════════════════
  const Messages = {
    inbox:       ()              => get('/messages/inbox'),
    history:     (uid, limit=50) => get(`/messages/${uid}?limit=${limit}`),
    send:        (uid, text)     => post(`/messages/${uid}`, { text }),
    markRead:    (uid)           => post(`/messages/${uid}/read`),
  };

  // ════════════════════════════════════════
  //  GROUPS
  // ════════════════════════════════════════
  const Groups = {
    list:        ()          => get('/groups'),
    create:      (body)      => post('/groups', body),
    detail:      (id)        => get(`/groups/${id}`),
    join:        (id)        => post(`/groups/${id}/join`),
    leave:       (id)        => del(`/groups/${id}/leave`),
    getPosts:    (id)        => get(`/groups/${id}/posts`),
    createPost:  (id, text)  => post(`/groups/${id}/posts`, { text }),
    deletePost:  (id, pid)   => del(`/groups/${id}/posts/${pid}`),
  };

  // ════════════════════════════════════════
  //  SOCKET.IO — Real-time
  // ════════════════════════════════════════
  const Socket = {
    _io: null,
    _handlers: {},

    connect(token) {
      if (Socket._io?.connected) return;

      // Load Socket.IO client dynamically
      if (!window.io) {
        const s = document.createElement('script');
        s.src = `${SOCKET_URL}/socket.io/socket.io.js`;
        s.onload = () => Socket._doConnect(token);
        document.head.appendChild(s);
      } else {
        Socket._doConnect(token);
      }
    },

    _doConnect(token) {
      Socket._io = window.io(SOCKET_URL, {
        reconnection:      true,
        reconnectionDelay: 2000,
        transports:        ['websocket', 'polling'],
      });

      Socket._io.on('connect', () => {
        console.log('🔌 Socket connected');
        Socket._io.emit('authenticate', { token });
      });

      Socket._io.on('authenticated', ({ user }) => {
        console.log('✅ Socket authenticated as', user.username);
        window.dispatchEvent(new CustomEvent('fs:socket:ready', { detail: { user } }));
      });

      Socket._io.on('auth_error', ({ error }) => {
        console.warn('❌ Socket auth error:', error);
      });

      // Real-time message received
      Socket._io.on('message:receive', ({ message }) => {
        window.dispatchEvent(new CustomEvent('fs:message:receive', { detail: message }));
      });

      // Your sent message confirmed
      Socket._io.on('message:sent', ({ message }) => {
        window.dispatchEvent(new CustomEvent('fs:message:sent', { detail: message }));
      });

      // Read receipt
      Socket._io.on('message:read_receipt', (data) => {
        window.dispatchEvent(new CustomEvent('fs:message:read', { detail: data }));
      });

      // Typing indicator
      Socket._io.on('typing:indicator', ({ from, typing }) => {
        window.dispatchEvent(new CustomEvent('fs:typing', { detail: { from, typing } }));
      });

      // Presence updates
      Socket._io.on('presence:update', ({ userId, online }) => {
        window.dispatchEvent(new CustomEvent('fs:presence', { detail: { userId, online } }));
      });

      // Unread message count
      Socket._io.on('unread:count', ({ count }) => {
        window.dispatchEvent(new CustomEvent('fs:unread', { detail: { count } }));
      });

      // New notification
      Socket._io.on('notification:new', ({ notification }) => {
        window.dispatchEvent(new CustomEvent('fs:notification', { detail: notification }));
      });

      Socket._io.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
      });

      // Ping every 30s to keep last_seen updated
      setInterval(() => {
        if (Socket._io?.connected) Socket._io.emit('presence:ping');
      }, 30000);
    },

    disconnect() {
      Socket._io?.disconnect();
      Socket._io = null;
    },

    /** Send a real-time DM */
    send({ to, text }) {
      if (!Socket._io?.connected) {
        console.warn('Socket not connected — falling back to REST');
        return Messages.send(to, text);
      }
      Socket._io.emit('message:send', { to, text });
    },

    /** Tell recipient you are typing */
    typingStart(to) { Socket._io?.emit('typing:start', { to }); },
    typingStop(to)  { Socket._io?.emit('typing:stop',  { to }); },

    /** Mark DMs from a user as read */
    markRead(from) { Socket._io?.emit('message:read', { from }); },

    isConnected: () => !!Socket._io?.connected,
  };

  // ── Auto-connect if token exists on page load ──
  window.addEventListener('DOMContentLoaded', () => {
    if (Token.get()) {
      Socket.connect(Token.get());
    }

    // Listen for unauthorized events → show login modal
    window.addEventListener('fs:unauthorized', () => {
      if (typeof UI !== 'undefined') UI.toast('Session expired. Please log in again.', 'warn');
      // You could show a login modal here
    });
  });

  // ── Public API ─────────────────────────────
  return { 
    auth: Auth, 
    posts: Posts, 
    friends: Friends, 
    messages: Messages, 
    groups: Groups, 
    socket: Socket, 
    token: Token 
  };

})();