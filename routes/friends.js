const express  = require('express');
const { v4: uuid } = require('uuid');
const db       = require('../models/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET MY FRIENDS ────────────────────────
router.get('/', requireAuth, (req, res) => {
  const friends = db.prepare(`
    SELECT
      u.id, u.username, u.handle, u.emoji, u.mood, u.last_seen,
      u.privacy_online,
      f.created_at AS friends_since
    FROM friendships f
    JOIN users u ON u.id = CASE
      WHEN f.sender_id   = ? THEN f.receiver_id
      WHEN f.receiver_id = ? THEN f.sender_id
    END
    WHERE (f.sender_id = ? OR f.receiver_id = ?) AND f.status = 'accepted'
    ORDER BY u.username
  `).all(req.user.id, req.user.id, req.user.id, req.user.id);

  return res.json({ friends });
});

// ── GET INCOMING REQUESTS ─────────────────
router.get('/requests', requireAuth, (req, res) => {
  const requests = db.prepare(`
    SELECT u.id, u.username, u.handle, u.emoji, f.created_at AS requested_at,
      (SELECT COUNT(*) FROM friendships f2
       WHERE ((f2.sender_id = u.id AND f2.receiver_id IN (
                 SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
                 FROM friendships WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'))
           OR (f2.receiver_id = u.id AND f2.sender_id IN (
                 SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
                 FROM friendships WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted')))
       AND f2.status = 'accepted') AS mutual_friends
    FROM friendships f
    JOIN users u ON u.id = f.sender_id
    WHERE f.receiver_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(
    req.user.id, req.user.id, req.user.id,
    req.user.id, req.user.id, req.user.id,
    req.user.id
  );

  return res.json({ requests });
});

// ── SEND FRIEND REQUEST ───────────────────
router.post('/request/:uid', requireAuth, (req, res) => {
  const targetId = req.params.uid;
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "You can't add yourself." });
  }

  const target = db.prepare('SELECT id, username, allow_friend_reqs FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (!target.allow_friend_reqs) {
    return res.status(403).json({ error: `${target.username} is not accepting friend requests.` });
  }

  const existing = db.prepare(`
    SELECT * FROM friendships
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
  `).get(req.user.id, targetId, targetId, req.user.id);

  if (existing) {
    if (existing.status === 'accepted') return res.status(409).json({ error: 'Already friends.' });
    if (existing.status === 'pending')  return res.status(409).json({ error: 'Request already sent.' });
    if (existing.status === 'blocked')  return res.status(403).json({ error: 'Cannot send request.' });
  }

  db.prepare(`
    INSERT INTO friendships (id, sender_id, receiver_id, status)
    VALUES (?, ?, ?, 'pending')
  `).run(uuid(), req.user.id, targetId);

  // Notify target
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, from_user, ref_id, text)
    VALUES (?, ?, 'friend_request', ?, ?, ?)
  `).run(uuid(), targetId, req.user.id, req.user.id,
         `${req.user.username} sent you a friend request 👥`);

  return res.status(201).json({ message: `Friend request sent to ${target.username}!` });
});

// ── ACCEPT REQUEST ────────────────────────
router.post('/accept/:uid', requireAuth, (req, res) => {
  const senderId = req.params.uid;
  const friendship = db.prepare(`
    SELECT * FROM friendships
    WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
  `).get(senderId, req.user.id);

  if (!friendship) {
    return res.status(404).json({ error: 'No pending request found from this user.' });
  }

  db.prepare(`UPDATE friendships SET status = 'accepted' WHERE id = ?`).run(friendship.id);

  // Notify sender
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, from_user, ref_id, text)
    VALUES (?, ?, 'friend_request', ?, ?, ?)
  `).run(uuid(), senderId, req.user.id, req.user.id,
         `${req.user.username} accepted your friend request! 💜`);

  const sender = db.prepare('SELECT id, username, handle, emoji FROM users WHERE id = ?').get(senderId);
  return res.json({ message: `You are now friends with ${sender.username}!`, friend: sender });
});

// ── DECLINE REQUEST ───────────────────────
router.post('/decline/:uid', requireAuth, (req, res) => {
  db.prepare(`
    DELETE FROM friendships
    WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
  `).run(req.params.uid, req.user.id);

  return res.json({ message: 'Request declined.' });
});

// ── REMOVE FRIEND / CANCEL REQUEST ───────
router.delete('/:uid', requireAuth, (req, res) => {
  db.prepare(`
    DELETE FROM friendships
    WHERE (sender_id = ? AND receiver_id = ?)
       OR (sender_id = ? AND receiver_id = ?)
  `).run(req.user.id, req.params.uid, req.params.uid, req.user.id);

  return res.json({ message: 'Removed.' });
});

// ── SEARCH USERS ──────────────────────────
router.get('/search', requireAuth, (req, res) => {
  const q = `%${(req.query.q || '').trim()}%`;
  if (!req.query.q) return res.json({ users: [] });

  const users = db.prepare(`
    SELECT id, username, handle, emoji, bio, mood
    FROM users
    WHERE (username LIKE ? OR handle LIKE ?) AND id != ?
    LIMIT 20
  `).all(q, q, req.user.id);

  return res.json({ users });
});

module.exports = router;
