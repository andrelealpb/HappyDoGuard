import { Router } from 'express';
import { pool } from '../db/pool.js';
import {
  generateToken,
  hashPassword,
  comparePassword,
  authenticate,
  authorize,
} from '../services/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const valid = await comparePassword(password, user.hashed_password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user);
    res.json({ access_token: token, token_type: 'bearer' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (admin only)
router.post('/register', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { email, password, full_name, role = 'viewer' } = req.body;
    const hashed = await hashPassword(password);
    const { rows } = await pool.query(
      `INSERT INTO users (email, hashed_password, full_name, role)
       VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, created_at`,
      [email, hashed, full_name, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
