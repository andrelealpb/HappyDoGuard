import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

// GET /hooks/on-publish — Called by Nginx-RTMP when a stream starts
router.get('/on-publish', async (req, res) => {
  try {
    const { name: streamKey, addr } = req.query;

    // Validate stream key
    const { rows } = await pool.query(
      'SELECT id FROM cameras WHERE stream_key = $1',
      [streamKey]
    );

    if (rows.length === 0) {
      console.log(`Rejected unknown stream key: ${streamKey} from ${addr}`);
      return res.status(403).end();
    }

    // Update camera status to online
    await pool.query(
      `UPDATE cameras SET status = 'online', last_seen_at = now(), updated_at = now()
       WHERE stream_key = $1`,
      [streamKey]
    );

    // Create online event
    await pool.query(
      `INSERT INTO events (camera_id, type, payload)
       VALUES ($1, 'online', $2)`,
      [rows[0].id, JSON.stringify({ addr })]
    );

    console.log(`Stream started: ${streamKey} from ${addr}`);
    res.status(200).end();
  } catch (err) {
    console.error('on-publish error:', err.message);
    res.status(500).end();
  }
});

// GET /hooks/on-publish-done — Called when stream stops
router.get('/on-publish-done', async (req, res) => {
  try {
    const { name: streamKey } = req.query;

    const { rows } = await pool.query(
      `UPDATE cameras SET status = 'offline', updated_at = now()
       WHERE stream_key = $1 RETURNING id`,
      [streamKey]
    );

    if (rows.length > 0) {
      await pool.query(
        `INSERT INTO events (camera_id, type, payload) VALUES ($1, 'offline', '{}')`,
        [rows[0].id]
      );
    }

    console.log(`Stream stopped: ${streamKey}`);
    res.status(200).end();
  } catch (err) {
    console.error('on-publish-done error:', err.message);
    res.status(500).end();
  }
});

// GET /hooks/on-record-done — Called when a recording segment finishes
router.get('/on-record-done', async (req, res) => {
  try {
    const { name: streamKey, path: filePath } = req.query;

    const { rows: cameras } = await pool.query(
      'SELECT id FROM cameras WHERE stream_key = $1',
      [streamKey]
    );

    if (cameras.length > 0) {
      await pool.query(
        `INSERT INTO recordings (camera_id, file_path, started_at)
         VALUES ($1, $2, now())`,
        [cameras[0].id, filePath]
      );
    }

    console.log(`Recording done: ${streamKey} → ${filePath}`);
    res.status(200).end();
  } catch (err) {
    console.error('on-record-done error:', err.message);
    res.status(500).end();
  }
});

export default router;
