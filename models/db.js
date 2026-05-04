/**
 * KipinQ — Database Layer (SQLite via better-sqlite3)
 *
 * Tables:
 *   users           — registered accounts
 *   friendships     — friend relationships + requests
 *   posts           — feed posts
 *   post_likes      — who liked which post
 *   comments        — comments on posts
 *   comment_likes   — who liked which comment
 *   messages        — DM messages (real-time via Socket.IO, persisted here)
 *   group_members   — who joined which group
 *   groups          — community groups
 *   notifications   — in-app notifications
 */

const Database = require('better-sqlite3');
const path     = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './KipinQ.db';
const db      = new Database(path.resolve(DB_PATH));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─────────────────────────────────────────
//  Schema
// ─────────────────────────────────────────
db.exec(`

  -- ── Users ──
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    handle        TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    emoji         TEXT DEFAULT '😎',
    bio           TEXT DEFAULT '',
    tagline       TEXT DEFAULT '',
    mood          TEXT DEFAULT '😊 Happy',
    location      TEXT DEFAULT '',
    status        TEXT DEFAULT '💜 Single',
    zodiac        TEXT DEFAULT '',
    profile_song_title  TEXT DEFAULT '',
    profile_song_artist TEXT DEFAULT '',
    privacy_profile     TEXT DEFAULT 'everyone',  -- everyone | friends | only-me
    privacy_posts       TEXT DEFAULT 'everyone',  -- everyone | friends | only-me
    privacy_online      INTEGER DEFAULT 1,        -- 0 | 1
    allow_friend_reqs   INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now')),
    last_seen     TEXT DEFAULT (datetime('now'))
  );

  -- ── Friendships ──
  CREATE TABLE IF NOT EXISTS friendships (
    id         TEXT PRIMARY KEY,
    sender_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     TEXT DEFAULT 'pending',  -- pending | accepted | blocked
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(sender_id, receiver_id)
  );

  -- ── Posts ──
  CREATE TABLE IF NOT EXISTS posts (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text       TEXT DEFAULT '',
    mood       TEXT DEFAULT '',
    song       TEXT DEFAULT '',
    privacy    TEXT DEFAULT 'everyone',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Post Photos (one post → many photos) ──
  CREATE TABLE IF NOT EXISTS post_photos (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Post Likes ──
  CREATE TABLE IF NOT EXISTS post_likes (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
  );

  -- ── Comments ──
  CREATE TABLE IF NOT EXISTS comments (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Comment Likes ──
  CREATE TABLE IF NOT EXISTS comment_likes (
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, comment_id)
  );

  -- ── Direct Messages ──
  CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY,
    sender_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    read        INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  -- ── Groups ──
  CREATE TABLE IF NOT EXISTS groups (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    desc       TEXT DEFAULT '',
    emoji      TEXT DEFAULT '🌐',
    gradient   TEXT DEFAULT 'linear-gradient(135deg,#7B2FBE,#FF6B9D)',
    creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    members    INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Group Members ──
  CREATE TABLE IF NOT EXISTS group_members (
    group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT DEFAULT 'member',  -- member | admin | owner
    joined_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (group_id, user_id)
  );

  -- ── Group Posts ──
  CREATE TABLE IF NOT EXISTS group_posts (
    id         TEXT PRIMARY KEY,
    group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- ── Notifications ──
  CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,  -- friend_request | like | comment | message | group_join
    from_user  TEXT,
    ref_id     TEXT,           -- post_id, message_id, group_id etc.
    text       TEXT NOT NULL,
    read       INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

`);

console.log('✅ Database initialised at', DB_PATH);

module.exports = db;
