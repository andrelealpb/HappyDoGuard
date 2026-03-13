import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../services/auth.js';

const router = Router();

// GET /api/recordings — List all recordings (with filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { camera_id, from, to, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (camera_id) {
      conditions.push(`r.camera_id = $${idx++}`);
      params.push(camera_id);
    }
    if (from) {
      conditions.push(`r.started_at >= $${idx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`r.started_at <= $${idx++}`);
      params.push(to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT r.*, c.name as camera_name, c.stream_key
       FROM recordings r JOIN cameras c ON r.camera_id = c.id
       ${where} ORDER BY r.started_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recordings/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, c.name as camera_name
       FROM recordings r JOIN cameras c ON r.camera_id = c.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Recording not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
