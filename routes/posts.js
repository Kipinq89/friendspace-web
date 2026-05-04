/**
 * FriendSpace — Posts Routes
 *
 * GET    /api/posts          — get feed (friends + own posts)
 * POST   /api/posts          — create post
 * DELETE /api/posts/:id      — delete own post
 * POST   /api/posts/:id/like — toggle like
 * GET    /api/posts/:id/comments      — get comments
 * POST   /api/posts/:id/comments      — add comment
 * DELETE /api/posts/:id/comments/:cid — delete own comment
 */

const express  = require('express');
const { v4: uuid } = require('uuid');
const db       = require('../models/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET FEED ──────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 20, 50);
  const offset = parseInt(req.query.offset) || 0;

  // Get IDs of people the current user is friends with
  const friendIds = db.prepare(`
    SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS fid
    FROM friendships
    WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
  `).all(req.user.id, req.user.id, req.user.id).map(r => r.fid);

  const allIds = [req.user.id, ...friendIds];
  const placeholders = allIds.map(() => '?').join(',');

  const posts = db.prepare(`
    SELECT
      p.*,
      u.username, u.emoji, u.handle,
      (SELECT COUNT(*) FROM post_likes  WHERE post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments    WHERE post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM post_likes  WHERE post_id = p.id AND user_id = ?) AS liked_by_me
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id IN (${placeholders})
      AND (p.privacy = 'everyone'
           OR (p.privacy = 'friends' AND p.user_id != ?)
           OR  p.user_id = ?)
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.user.id, ...allIds, req.user.id, req.user.id, limit, offset);

  // Attach photos to each post
  const result = posts.map(post => {
    const photos = db.prepare(
      'SELECT url FROM post_photos WHERE post_id = ? ORDER BY created_at'
    ).all(post.id).map(p => p.url);
    return { ...post, photos, liked_by_me: !!post.liked_by_me };
  });

  return res.json({ posts: result, total: result.length, offset });
});

// ── CREATE POST ───────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { text, mood, song, privacy = 'everyone', photos = [] } = req.body;

  if (!text && (!photos || photos.length === 0)) {
    return res.status(400).json({ error: 'Post must have text or at least one photo.' });
  }

  const id = uuid();
  db.prepare(`
    INSERT INTO posts (id, user_id, text, mood, song, privacy)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, text || '', mood || '', song || '', privacy);

  // Insert photos (base64 URLs or file URLs passed from frontend)
  if (Array.isArray(photos)) {
    photos.forEach(url => {
      db.prepare(
        'INSERT INTO post_photos (id, post_id, url) VALUES (?, ?, ?)'
      ).run(uuid(), id, url);
    });
  }

  const post = db.prepare(`
    SELECT p.*, u.username, u.emoji, u.handle,
      0 AS like_count, 0 AS comment_count, 0 AS liked_by_me
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `).get(id);

  return res.status(201).json({ post: { ...post, photos } });
});

// ── DELETE POST ───────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Post deleted.' });
});

// ── TOGGLE LIKE ───────────────────────────
router.post('/:id/like', requireAuth, (req, res) => {
  const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const existing = db.prepare(
    'SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?'
  ).get(req.user.id, req.params.id);

  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?')
      .run(req.user.id, req.params.id);
  } else {
    db.prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)')
      .run(req.user.id, req.params.id);

    // Notify post owner (not yourself)
    if (post.user_id !== req.user.id) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, from_user, ref_id, text)
        VALUES (?, ?, 'like', ?, ?, ?)
      `).run(uuid(), post.user_id, req.user.id,
             req.params.id, `${req.user.username} liked your post 💜`);
    }
  }

  const count = db.prepare(
    'SELECT COUNT(*) AS c FROM post_likes WHERE post_id = ?'
  ).get(req.params.id).c;

  return res.json({ liked: !existing, like_count: count });
});

// ── GET COMMENTS ──────────────────────────
router.get('/:id/comments', requireAuth, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.emoji,
      (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS like_count,
      (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id AND user_id = ?) AS liked_by_me
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.user.id, req.params.id);

  return res.json({ comments: comments.map(c => ({ ...c, liked_by_me: !!c.liked_by_me })) });
});

// ── ADD COMMENT ───────────────────────────
router.post('/:id/comments', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  const post = db.prepare('SELECT id, user_id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const id = uuid();
  db.prepare(`
    INSERT INTO comments (id, post_id, user_id, text)
    VALUES (?, ?, ?, ?)
  `).run(id, req.params.id, req.user.id, text.trim());

  // Notify post owner
  if (post.user_id !== req.user.id) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, from_user, ref_id, text)
      VALUES (?, ?, 'comment', ?, ?, ?)
    `).run(uuid(), post.user_id, req.user.id,
           id, `${req.user.username} commented on your post 💬`);
  }

  const comment = db.prepare(`
    SELECT c.*, u.username, u.emoji, 0 AS like_count, 0 AS liked_by_me
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(id);

  return res.status(201).json({ comment });
});

// ── DELETE COMMENT ────────────────────────
router.delete('/:id/comments/:cid', requireAuth, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.cid);
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });
  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own comments.' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.cid);
  return res.json({ message: 'Comment deleted.' });
});

// ── LIKE / UNLIKE COMMENT ─────────────────
router.post('/:id/comments/:cid/like', requireAuth, (req, res) => {
  const existing = db.prepare(
    'SELECT 1 FROM comment_likes WHERE user_id = ? AND comment_id = ?'
  ).get(req.user.id, req.params.cid);

  if (existing) {
    db.prepare('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?')
      .run(req.user.id, req.params.cid);
  } else {
    db.prepare('INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)')
      .run(req.user.id, req.params.cid);
  }

  const count = db.prepare(
    'SELECT COUNT(*) AS c FROM comment_likes WHERE comment_id = ?'
  ).get(req.params.cid).c;

  return res.json({ liked: !existing, like_count: count });
});

module.exports = router;