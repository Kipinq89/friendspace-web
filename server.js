/**
 * KipinQ — Backend Server
 * Express REST API + Socket.IO WebSocket server
 *
 * Start: node server.js  (or: npm run dev for auto-reload)
 */

require('dotenv').config();
const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const fs           = require('fs');

const CLIENT_URL = process.env.CLIENT_URL || '*';
const CORS_ORIGIN = CLIENT_URL === '*' ? true : CLIENT_URL;
const CORS_CREDENTIALS = CLIENT_URL !== '*';

// ── App setup ─────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin:      CORS_ORIGIN,
    methods:     ['GET', 'POST'],
    credentials: CORS_CREDENTIALS,
  },
  pingTimeout:  60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Allow inline scripts for login page
      scriptSrcAttr: ["'unsafe-inline'"],        // Allow onclick and other inline event handlers
      styleSrc: ["'self'", "'unsafe-inline'"],   // Allow inline styles
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin:      CORS_ORIGIN,
  credentials: CORS_CREDENTIALS,
}));
app.use(express.json({ limit: '20mb' }));        // allow base64 photo uploads
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please try again later.' },
});
// Apply rate limiter only to login and register endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Static file uploads ────────────────────
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Serve frontend (optional) ──────────────
// Put your index.html + js + css folder as "public" next to server.js
const PUBLIC_DIR = path.resolve('./public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

// ── API Routes ─────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/posts',    require('./routes/posts'));
app.use('/api/friends',  require('./routes/friends'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/groups',   require('./routes/groups'));

// ── Health check ───────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    version:   '3.14.4',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 handler ────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ───────────────────
app.use((err, req, res, _next) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : err.message,
  });
});

// ── Socket.IO ─────────────────────────────
require('./socket/handler')(io);

// ── Start ──────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   ✨ KipinQ Backend Running ✨   ║
║   http://localhost:${PORT}               ║
║   ENV: ${process.env.NODE_ENV || 'development'}                   ║
╚═══════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
