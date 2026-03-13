import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate, authorize } from '../services/auth.js';
import crypto from 'crypto';

const router = Router();

// GET /api/webhooks
router.get('/', authenticate, authorize('admin'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, url, events, is_active, created_at FROM webhooks ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/webhooks — Register a new webhook
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { url, events = [] } = req.body;
    const secret = crypto.randomBytes(32).toString('hex');
    const { rows } = await pool.query(
      `INSERT INTO webhooks (url, events, secret)
       VALUES ($1, $2, $3) RETURNING *`,
      [url, events, secret]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/webhooks/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM webhooks WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Webhook not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
