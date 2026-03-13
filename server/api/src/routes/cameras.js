import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../services/auth.js';
import { generateStreamKey, getHlsUrl, getRtmpUrl } from '../services/rtmp.js';
import { findRecordingByTimestamp, listRecordings } from '../services/recording.js';

const router = Router();

// GET /api/cameras — List cameras with status
router.get('/', authenticate, async (req, res) => {
  try {
    const { pdv_id, status } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (pdv_id) {
      conditions.push(`c.pdv_id = $${idx++}`);
      params.push(pdv_id);
    }
    if (status) {
      conditions.push(`c.status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT c.*, p.name as pdv_name
       FROM cameras c JOIN pdvs p ON c.pdv_id = p.id
       ${where} ORDER BY p.name, c.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cameras — Register new camera
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, pdv_id, model, camera_group, location_description } = req.body;
    const streamKey = generateStreamKey();
    const { rows } = await pool.query(
      `INSERT INTO cameras (name, stream_key, model, camera_group, location_description, pdv_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, streamKey, model || 'MIBO Intelbras', camera_group || 'im', location_description, pdv_id]
    );
    const camera = rows[0];
    res.status(201).json({
      ...camera,
      rtmp_url: getRtmpUrl(camera.stream_key),
      hls_url: getHlsUrl(camera.stream_key),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cameras/:id — Camera details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, p.name as pdv_name
       FROM cameras c JOIN pdvs p ON c.pdv_id = p.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Camera not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/cameras/:id — Update camera
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, model, location_description } = req.body;
    const { rows } = await pool.query(
      `UPDATE cameras SET
         name = COALESCE($2, name),
         model = COALESCE($3, model),
         location_description = COALESCE($4, location_description),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, model, location_description]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Camera not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cameras/:id/live — HLS stream URL
router.get('/:id/live', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT stream_key, status FROM cameras WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Camera not found' });
    const { stream_key, status } = rows[0];
    res.json({
      hls_url: getHlsUrl(stream_key),
      rtmp_url: getRtmpUrl(stream_key),
      status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cameras/:id/recordings — List recordings by period
router.get('/:id/recordings', authenticate, async (req, res) => {
  try {
    const { from, to, limit, offset } = req.query;
    const recordings = await listRecordings(req.params.id, {
      from, to,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    res.json(recordings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cameras/:id/recording?timestamp=...&duration=... — Find recording by exact timestamp
router.get('/:id/recording', authenticate, async (req, res) => {
  try {
    const { timestamp, duration } = req.query;
    if (!timestamp) return res.status(400).json({ error: 'timestamp is required' });
    const recording = await findRecordingByTimestamp(
      req.params.id,
      timestamp,
      parseInt(duration) || 300
    );
    if (!recording) return res.status(404).json({ error: 'No recording found for this timestamp' });
    res.json(recording);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cameras/:id/snapshot — Current frame (JPEG)
router.get('/:id/snapshot', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT stream_key, status FROM cameras WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Camera not found' });
    if (rows[0].status !== 'online') {
      return res.status(503).json({ error: 'Camera is offline' });
    }
    // TODO: extract frame from HLS stream via FFmpeg
    res.status(501).json({ error: 'Snapshot extraction not yet implemented' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cameras/:id/download?from=...&to=... — Download MP4 clip
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
    // TODO: extract and serve MP4 clip via FFmpeg
    res.status(501).json({ error: 'Download not yet implemented' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
