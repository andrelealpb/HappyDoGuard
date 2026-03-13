import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Express middleware: authenticates via JWT (Authorization: Bearer ...)
 * or API Key (X-API-Key header).
 */
export function authenticate(req, res, next) {
  // Try API Key first
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    pool
      .query('SELECT * FROM api_keys WHERE key = $1 AND is_active = true', [apiKey])
      .then(({ rows }) => {
        if (rows.length === 0) {
          return res.status(401).json({ error: 'Invalid API key' });
        }
        req.auth = { type: 'api_key', key: rows[0] };
        next();
      })
      .catch(() => res.status(500).json({ error: 'Auth error' }));
    return;
  }

  // Try JWT
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authentication' });
  }

  try {
    const decoded = verifyToken(header.slice(7));
    req.auth = { type: 'jwt', user: decoded };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restrict to specific roles. Must be used after authenticate().
 */
export function authorize(...roles) {
  return (req, res, next) => {
    // API keys have full access
    if (req.auth?.type === 'api_key') return next();
    if (!roles.includes(req.auth?.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
