/**
 * FriendSpace — Messages Routes (REST)
 * Real-time delivery is via Socket.IO (see socket/handler.js).
 * REST endpoints handle history fetch + read receipts.
 *
 * GET  /api/messages/inbox          — list conversations (latest msg per friend)
 * GET  /api/messages/:uid           — get full DM history with a user
 * POST /api/messages/:uid           — send a message (fallback / offline)
 * POST /api/messages/:uid/read      — mark all messages from :uid as read
 * GET  /api/notifications           — get all notifications
 * POST /api/notifications/read-all  — mark all as read
 */

const express  = require('express');
const { v4: uuid } = require('uuid');
const db       = require('../models/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── INBOX (conversations list) ─────────────
router.get('/inbox', requireAuth, (req, res) => {
  // One row per conversation partner, with latest message and unread count
  const convos = db.prepare(`
    SELECT
      u.id, u.username, u.handle, u.emoji, u.last_seen, u.privacy_online,
      m.text         AS last_message,
      m.created_at   AS last_at,
      m.from_me,
      (SELECT COUNT(*) FROM messages
       WHERE sender_id = u.id AND receiver_id = ? AND read = 0) AS unread_count
    FROM users u
    JOIN (
      SELECT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner,
        text,
        created_at,
        (sender_id = ?) AS from_me
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY partner
      HAVING created_at = MAX(created_at)
    ) m ON m.partner = u.id
    ORDER BY m.created_at DESC
  `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);

  return res.json({ conversations: convos });
});

// ── DM HISTORY with a user ─────────────────
router.get('/:uid', requireAuth, (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before; // ISO timestamp for pagination

  let query = `
    SELECT m.*, u.username, u.emoji,
      (m.sender_id = ?) AS from_me
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
  `;
  const params = [req.user.id, req.user.id, req.params.uid, req.params.uid, req.user.id];

  if (before) {
    query += ' AND m.created_at < ?';
    params.push(before);
  }
  query += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(limit);

  const messages = db.prepare(query).all(...params).reverse();
  return res.json({ messages });
});

// ── SEND MESSAGE (REST fallback) ───────────
router.post('/:uid', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.uid);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  const id = uuid();
  db.prepare(`
    INSERT INTO messages (id, sender_id, receiver_id, text)
    VALUES (?, ?, ?, ?)
  `).run(id, req.user.id, req.params.uid, text.trim());

  const message = db.prepare(`
    SELECT m.*, u.username, u.emoji, 1 AS from_me
    FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
  `).get(id);

  return res.status(201).json({ message });
});

// ── MARK AS READ ───────────────────────────
router.post('/:uid/read', requireAuth, (req, res) => {
  db.prepare(`
    UPDATE messages SET read = 1
    WHERE sender_id = ? AND receiver_id = ? AND read = 0
  `).run(req.params.uid, req.user.id);

  return res.json({ message: 'Marked as read.' });
});

// ── NOTIFICATIONS ──────────────────────────
router.get('/notifications/all', requireAuth, (req, res) => {
  const notifs = db.prepare(`
    SELECT n.*, u.username AS from_username, u.emoji AS from_emoji
    FROM notifications n
    LEFT JOIN users u ON u.id = n.from_user
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);

  const unread = notifs.filter(n => !n.read).length;
  return res.json({ notifications: notifs, unread });
});

router.post('/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  return res.json({ message: 'All notifications marked as read.' });
});

module.exports = router;