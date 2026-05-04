/**
 * FriendSpace — Socket.IO Real-Time Handler
 *
 * Events emitted BY client → handled here:
 *   authenticate          { token }          — log in over WS
 *   message:send          { to, text }       — send DM
 *   message:read          { from }           — mark messages as read
 *   typing:start          { to }             — started typing indicator
 *   typing:stop           { to }             — stopped typing indicator
 *   presence:ping         {}                 — keep alive / update last_seen
 *
 * Events emitted TO client:
 *   authenticated         { user }           — login confirmed
 *   auth_error            { error }          — bad token
 *   message:receive       { message }        — incoming DM
 *   message:sent          { message }        — echo of sent DM (confirmed)
 *   message:read_receipt  { from, count }    — recipient read your messages
 *   typing:indicator      { from, typing }   — someone is typing
 *   presence:update       { userId, online } — a friend went online/offline
 *   notification:new      { notification }   — new notification
 *   error                 { message }        — generic error
 */

const jwt      = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db       = require('../models/db');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'friendspace_secret';

// Map: userId → Set of socket IDs (one user can have multiple tabs)
const onlineUsers = new Map();

module.exports = function attachSocketHandlers(io) {

  io.on('connection', (socket) => {
    let currentUserId = null;

    // ── AUTHENTICATE ─────────────────────────
    socket.on('authenticate', ({ token } = {}) => {
      try {
        const decoded = jwt.verify(token, SECRET);
        currentUserId = decoded.id;

        // Register socket
        if (!onlineUsers.has(currentUserId)) {
          onlineUsers.set(currentUserId, new Set());
        }
        onlineUsers.get(currentUserId).add(socket.id);

        // Join personal room (for targeted events)
        socket.join(`user:${currentUserId}`);

        // Update last_seen
        db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(currentUserId);

        // Tell client they're in
        const user = db.prepare('SELECT id, username, handle, emoji FROM users WHERE id = ?')
                       .get(currentUserId);
        socket.emit('authenticated', { user });

        // Notify friends this user came online
        broadcastPresence(io, currentUserId, true);

        // Deliver any unread message count immediately
        const unread = db.prepare(
          'SELECT COUNT(*) AS c FROM messages WHERE receiver_id = ? AND read = 0'
        ).get(currentUserId).c;
        socket.emit('unread:count', { count: unread });

        console.log(`✅ WS: ${user.username} authenticated (socket ${socket.id})`);
      } catch (err) {
        socket.emit('auth_error', { error: 'Invalid or expired token. Please log in again.' });
        socket.disconnect(true);
      }
    });

    // ── SEND MESSAGE ─────────────────────────
    socket.on('message:send', ({ to, text } = {}) => {
      if (!currentUserId) return socket.emit('error', { message: 'Not authenticated.' });
      if (!to || !text?.trim()) return socket.emit('error', { message: 'Invalid message.' });

      // Persist to database
      const id = uuid();
      db.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, text)
        VALUES (?, ?, ?, ?)
      `).run(id, currentUserId, to, text.trim());

      const sender = db.prepare(
        'SELECT id, username, emoji FROM users WHERE id = ?'
      ).get(currentUserId);

      const message = {
        id,
        sender_id:   currentUserId,
        receiver_id: to,
        text:        text.trim(),
        created_at:  new Date().toISOString(),
        from_me:     true,
        username:    sender.username,
        emoji:       sender.emoji,
        read:        0,
      };

      // Echo back to sender (confirmed delivery)
      socket.emit('message:sent', { message });

      // Deliver to recipient (all their connected sockets)
      io.to(`user:${to}`).emit('message:receive', {
        message: { ...message, from_me: false },
      });

      // Create notification for recipient
      const notifId = uuid();
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user, ref_id, text)
        VALUES (?, ?, 'message', ?, ?, ?)
      `).run(notifId, to, currentUserId, id,
             `${sender.username} sent you a message 💬`);

      // Push notification to recipient
      io.to(`user:${to}`).emit('notification:new', {
        notification: {
          id: notifId,
          type: 'message',
          from_username: sender.username,
          from_emoji: sender.emoji,
          text: `${sender.username} sent you a message 💬`,
          created_at: new Date().toISOString(),
          read: 0,
        },
      });

      // Update unread count for recipient
      const recipientUnread = db.prepare(
        'SELECT COUNT(*) AS c FROM messages WHERE receiver_id = ? AND read = 0'
      ).get(to).c;
      io.to(`user:${to}`).emit('unread:count', { count: recipientUnread });
    });

    // ── MARK AS READ ─────────────────────────
    socket.on('message:read', ({ from } = {}) => {
      if (!currentUserId || !from) return;

      const result = db.prepare(`
        UPDATE messages SET read = 1
        WHERE sender_id = ? AND receiver_id = ? AND read = 0
      `).run(from, currentUserId);

      if (result.changes > 0) {
        // Notify sender their messages were read
        io.to(`user:${from}`).emit('message:read_receipt', {
          from: currentUserId,
          count: result.changes,
        });
      }

      // Update current user's unread count
      const unread = db.prepare(
        'SELECT COUNT(*) AS c FROM messages WHERE receiver_id = ? AND read = 0'
      ).get(currentUserId).c;
      socket.emit('unread:count', { count: unread });
    });

    // ── TYPING INDICATORS ─────────────────────
    socket.on('typing:start', ({ to } = {}) => {
      if (!currentUserId || !to) return;
      io.to(`user:${to}`).emit('typing:indicator', {
        from:   currentUserId,
        typing: true,
      });
    });

    socket.on('typing:stop', ({ to } = {}) => {
      if (!currentUserId || !to) return;
      io.to(`user:${to}`).emit('typing:indicator', {
        from:   currentUserId,
        typing: false,
      });
    });

    // ── PRESENCE PING ─────────────────────────
    socket.on('presence:ping', () => {
      if (!currentUserId) return;
      db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(currentUserId);
    });

    // ── DISCONNECT ────────────────────────────
    socket.on('disconnect', () => {
      if (!currentUserId) return;

      const sockets = onlineUsers.get(currentUserId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(currentUserId);
          db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(currentUserId);
          broadcastPresence(io, currentUserId, false);
          console.log(`👋 WS: user ${currentUserId} went offline`);
        }
      }
    });
  });

  // ── Helper: broadcast online/offline to friends ──
  function broadcastPresence(io, userId, isOnline) {
    const friends = db.prepare(`
      SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS fid
      FROM friendships
      WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
    `).all(userId, userId, userId);

    friends.forEach(({ fid }) => {
      io.to(`user:${fid}`).emit('presence:update', {
        userId,
        online: isOnline,
      });
    });
  }

  // Expose helper for other parts of the app
  io.getOnlineUsers = () => onlineUsers;
};