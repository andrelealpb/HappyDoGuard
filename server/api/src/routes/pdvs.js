import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../services/auth.js';

const router = Router();

// GET /api/pdvs — List PDVs with camera counts and status
router.get('/', authenticate, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
         COUNT(c.id) as camera_count,
         COUNT(c.id) FILTER (WHERE c.status = 'online') as cameras_online,
         COUNT(c.id) FILTER (WHERE c.status = 'offline') as cameras_offline
       FROM pdvs p
       LEFT JOIN cameras c ON c.pdv_id = p.id
       GROUP BY p.id
       ORDER BY p.name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pdvs
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, address, city = 'João Pessoa', state = 'PB' } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO pdvs (name, address, city, state)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, address, city, state]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pdvs/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
         json_agg(json_build_object(
           'id', c.id, 'name', c.name, 'status', c.status,
           'stream_key', c.stream_key, 'model', c.model
         )) FILTER (WHERE c.id IS NOT NULL) as cameras
       FROM pdvs p
       LEFT JOIN cameras c ON c.pdv_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'PDV not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pdvs/:id
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, address, city, state, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE pdvs SET
         name = COALESCE($2, name),
         address = COALESCE($3, address),
         city = COALESCE($4, city),
         state = COALESCE($5, state),
         is_active = COALESCE($6, is_active),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, address, city, state, is_active]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'PDV not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pdvs/:id/events
router.get('/:id/events', authenticate, async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    const conditions = ['c.pdv_id = $1'];
    const params = [req.params.id];
    let idx = 2;

    if (type) {
      conditions.push(`e.type = $${idx++}`);
      params.push(type);
    }

    const where = conditions.join(' AND ');
    const { rows } = await pool.query(
      `SELECT e.*, c.name as camera_name
       FROM events e JOIN cameras c ON e.camera_id = c.id
       WHERE ${where}
       ORDER BY e.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
