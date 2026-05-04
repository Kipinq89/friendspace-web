/**
 * KipinQ — Auth Middleware
 * Verifies JWT token from Authorization header.
 * Attaches req.user = { id, username, handle } on success.
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'KipinQ_secret';

/**
 * requireAuth — protects a route. Returns 401 if no/bad token.
 */
function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No token. Please log in.' });
    }

    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;   // { id, username, handle, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

/**
 * optionalAuth — attaches req.user if token exists, but never blocks.
 * Use for public routes that also have optional logged-in behaviour.
 */
function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      req.user = jwt.verify(token, SECRET);
    }
  } catch (_) { /* ignore */ }
  next();
}

/**
 * signToken — creates a JWT for a user record.
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, handle: user.handle },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { requireAuth, optionalAuth, signToken };