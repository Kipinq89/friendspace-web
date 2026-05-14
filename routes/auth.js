/**
 * KipinQ — Auth Routes
 *
 * POST /api/auth/register  — create account
 * POST /api/auth/login     — get JWT token
 * GET  /api/auth/me        — get current user profile
 * POST /api/auth/logout    — (client-side token drop; endpoint for logging)
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db       = require('../models/db');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

// ── REGISTER ──────────────────────────────
router.post('/register', (req, res) => {
  const { username, email, password, handle } = req.body;

  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Derived handle (e.g. @username) if not provided
  const finalHandle = handle
    ? handle.replace(/\s+/g, '_').toLowerCase()
    : `@${username.replace(/\s+/g, '_').toLowerCase()}`;

  // Check uniqueness
  const existing = db.prepare(
    'SELECT id FROM users WHERE email = ? OR username = ? OR handle = ?'
  ).get(email, username, finalHandle);

  if (existing) {
    return res.status(409).json({ error: 'Email, username or handle already taken.' });
  }

  // Hash password
  const hash = bcrypt.hashSync(password, 12);
  const id   = uuid();

  db.prepare(`
    INSERT INTO users (id, username, handle, email, password_hash)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, username, finalHandle, email, hash);

  const user  = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(user);

  return res.status(201).json({
    message: 'Account created! Welcome to KipinQ ✨',
    token,
    user: sanitizeUser(user),
  });
});

// ── LOGIN ─────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'No account found with that email.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Wrong password.' });
  }

  // Update last_seen
  db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(user.id);

  const token = signToken(user);

  return res.json({
    message: 'Welcome back! 💜',
    token,
    user: sanitizeUser(user),
  });
});

// ── GET CURRENT USER ──────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Attach counts
  const friendCount = db.prepare(
    `SELECT COUNT(*) AS c FROM friendships
     WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`
  ).get(req.user.id, req.user.id).c;

  const postCount = db.prepare(
    'SELECT COUNT(*) AS c FROM posts WHERE user_id = ?'
  ).get(req.user.id).c;

  const unreadMessages = db.prepare(
    'SELECT COUNT(*) AS c FROM messages WHERE receiver_id = ? AND read = 0'
  ).get(req.user.id).c;

  const pendingRequests = db.prepare(
    `SELECT COUNT(*) AS c FROM friendships
     WHERE receiver_id = ? AND status = 'pending'`
  ).get(req.user.id).c;

  return res.json({
    user: sanitizeUser(user),
    stats: {
      friends:        friendCount,
      posts:          postCount,
      unreadMessages,
      pendingRequests,
    },
  });
});

// ── LOGOUT (client just drops token; this is a no-op for logging) ──
router.post('/logout', requireAuth, (req, res) => {
  db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(req.user.id);
  return res.json({ message: 'Logged out. See you soon! 👋' });
});

// ── UPDATE PROFILE ────────────────────────
router.patch('/me', requireAuth, (req, res) => {
  const allowed = ['bio', 'tagline', 'mood', 'location', 'status', 'zodiac',
                   'emoji', 'profile_song_title', 'profile_song_artist', 'profile_song_url',
                   'privacy_profile', 'privacy_posts', 'privacy_online', 'allow_friend_reqs', 'youtube_url', 'spotify_url'];

  const updates = {};
  allowed.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update.' });
  }

  const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${sets} WHERE id = ?`)
    .run(...Object.values(updates), req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  return res.json({ user: sanitizeUser(user) });
});

// ── Helper: strip password from user object ──
function sanitizeUser(u) {
  const { password_hash, ...safe } = u;
  return safe;
}

module.exports = router;
