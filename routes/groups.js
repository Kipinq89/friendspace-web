/**
 * KipinQ — Groups Routes
 *
 * GET    /api/groups              — all groups (with joined flag)
 * POST   /api/groups              — create group
 * GET    /api/groups/:id          — group detail + members + posts
 * POST   /api/groups/:id/join     — join group
 * DELETE /api/groups/:id/leave    — leave group
 * GET    /api/groups/:id/posts    — group feed
 * POST   /api/groups/:id/posts    — post to group
 * DELETE /api/groups/:id/posts/:pid — delete group post
 */

const express  = require('express');
const { v4: uuid } = require('uuid');
const db       = require('../models/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── LIST ALL GROUPS ───────────────────────
router.get('/', requireAuth, (req, res) => {
  const groups = db.prepare(`
    SELECT
      g.*,
      (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count,
      (SELECT COUNT(*) FROM group_posts  WHERE group_id = g.id) AS post_count,
      (SELECT 1 FROM group_members WHERE group_id = g.id AND user_id = ?) AS joined
    FROM groups g
    ORDER BY member_count DESC
  `).all(req.user.id);

  return res.json({ groups: groups.map(g => ({ ...g, joined: !!g.joined })) });
});

// ── CREATE GROUP ──────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { name, desc, emoji, gradient } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required.' });

  const id = uuid();
  db.prepare(`
    INSERT INTO groups (id, name, desc, emoji, gradient, creator_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), desc || '', emoji || '🌐',
         gradient || 'linear-gradient(135deg,#7B2FBE,#FF6B9D)',
         req.user.id);

  // Creator auto-joins as owner
  db.prepare(`
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (?, ?, 'owner')
  `).run(id, req.user.id);

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
  return res.status(201).json({ group: { ...group, member_count: 1, post_count: 0, joined: true } });
});

// ── GET GROUP DETAIL ──────────────────────
router.get('/:id', requireAuth, (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  const members = db.prepare(`
    SELECT u.id, u.username, u.handle, u.emoji, gm.role, gm.joined_at
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY gm.joined_at
    LIMIT 20
  `).all(req.params.id);

  const joined = db.prepare(
    'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  const memberCount = db.prepare(
    'SELECT COUNT(*) AS c FROM group_members WHERE group_id = ?'
  ).get(req.params.id).c;

  const postCount = db.prepare(
    'SELECT COUNT(*) AS c FROM group_posts WHERE group_id = ?'
  ).get(req.params.id).c;

  return res.json({
    group: { ...group, member_count: memberCount, post_count: postCount, joined: !!joined },
    members,
  });
});

// ── JOIN GROUP ────────────────────────────
router.post('/:id/join', requireAuth, (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  const already = db.prepare(
    'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (already) return res.status(409).json({ error: 'Already a member.' });

  db.prepare(`
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (?, ?, 'member')
  `).run(req.params.id, req.user.id);

  const newCount = db.prepare(
    'SELECT COUNT(*) AS c FROM group_members WHERE group_id = ?'
  ).get(req.params.id).c;

  return res.json({ message: `Joined ${group.name}!`, member_count: newCount });
});

// ── LEAVE GROUP ───────────────────────────
router.delete('/:id/leave', requireAuth, (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  if (group.creator_id === req.user.id) {
    return res.status(403).json({ error: 'Group owner cannot leave. Delete the group instead.' });
  }

  db.prepare(
    'DELETE FROM group_members WHERE group_id = ? AND user_id = ?'
  ).run(req.params.id, req.user.id);

  return res.json({ message: `Left ${group.name}.` });
});

// ── GET GROUP POSTS ───────────────────────
router.get('/:id/posts', requireAuth, (req, res) => {
  const isMember = db.prepare(
    'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!isMember) return res.status(403).json({ error: 'Join this group to see posts.' });

  const limit  = Math.min(parseInt(req.query.limit) || 20, 50);
  const offset = parseInt(req.query.offset) || 0;

  const posts = db.prepare(`
    SELECT gp.*, u.username, u.emoji, u.handle
    FROM group_posts gp
    JOIN users u ON u.id = gp.user_id
    WHERE gp.group_id = ?
    ORDER BY gp.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.params.id, limit, offset);

  return res.json({ posts });
});

// ── POST TO GROUP ─────────────────────────
router.post('/:id/posts', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Post cannot be empty.' });

  const isMember = db.prepare(
    'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!isMember) return res.status(403).json({ error: 'Join this group to post.' });

  const id = uuid();
  db.prepare(`
    INSERT INTO group_posts (id, group_id, user_id, text)
    VALUES (?, ?, ?, ?)
  `).run(id, req.params.id, req.user.id, text.trim());

  const post = db.prepare(`
    SELECT gp.*, u.username, u.emoji
    FROM group_posts gp JOIN users u ON u.id = gp.user_id
    WHERE gp.id = ?
  `).get(id);

  return res.status(201).json({ post });
});

// ── DELETE GROUP POST ─────────────────────
router.delete('/:id/posts/:pid', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM group_posts WHERE id = ?').get(req.params.pid);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }

  db.prepare('DELETE FROM group_posts WHERE id = ?').run(req.params.pid);
  return res.json({ message: 'Post deleted.' });
});

module.exports = router;