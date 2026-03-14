import { Router } from 'express';
import { existsSync, statSync, createReadStream } from 'fs';
import { basename } from 'path';
import { pool } from '../db/pool.js';
import { authenticate, authorize } from '../services/auth.js';
import { cleanupCamera, cleanupAllCameras } from '../services/cleanup.js';

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

// GET /api/recordings/by-day — Get recordings for a camera on a specific day (for timeline)
router.get('/by-day', authenticate, async (req, res) => {
  try {
    const { camera_id, date } = req.query;
    if (!camera_id || !date) {
      return res.status(400).json({ error: 'camera_id and date (YYYY-MM-DD) are required' });
    }

    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const { rows } = await pool.query(
      `SELECT r.id, r.file_path, r.file_size, r.duration, r.started_at, r.ended_at,
              r.recording_type, r.thumbnail_path,
              c.name as camera_name, c.stream_key
       FROM recordings r JOIN cameras c ON r.camera_id = c.id
       WHERE r.camera_id = $1
         AND r.started_at >= $2
         AND r.started_at <= $3
       ORDER BY r.started_at ASC`,
      [camera_id, dayStart, dayEnd]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recordings/:id — Get recording details
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

// GET /api/recordings/:id/stream — Stream/serve the recording MP4 file
router.get('/:id/stream', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT file_path FROM recordings WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Recording not found' });

    const filePath = rows[0].file_path;
    if (!filePath || !existsSync(filePath)) {
      return res.status(404).json({ error: 'Recording file not found on disk' });
    }

    const stat = statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Partial content (range request for seeking)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `inline; filename="${basename(filePath)}"`,
      });
      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `inline; filename="${basename(filePath)}"`,
      });
      createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/recordings/:id/thumbnail — Serve or generate a thumbnail image for a recording
router.get('/:id/thumbnail', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT file_path, thumbnail_path FROM recordings WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Recording not found' });

    const { file_path, thumbnail_path } = rows[0];

    // If thumbnail exists on disk, serve it
    if (thumbnail_path && existsSync(thumbnail_path)) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="thumb-${req.params.id}.jpg"`);
      return createReadStream(thumbnail_path).pipe(res);
    }

    // Generate thumbnail on-the-fly from the video file using ffmpeg
    if (!file_path || !existsSync(file_path)) {
      return res.status(404).json({ error: 'Recording file not found' });
    }

    const { spawn } = await import('child_process');
    const ffmpeg = spawn('ffmpeg', [
      '-i', file_path,
      '-frames:v', '1',
      '-vf', 'scale=640:-1',
      '-f', 'image2',
      '-c:v', 'mjpeg',
      '-q:v', '3',
      '-loglevel', 'error',
      'pipe:1',
    ]);

    const chunks = [];
    ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
    ffmpeg.on('close', (code) => {
      if (code !== 0 || chunks.length === 0) {
        return res.status(500).json({ error: 'Failed to generate thumbnail' });
      }
      const buf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="thumb-${req.params.id}.jpg"`);
      res.send(buf);
    });
    ffmpeg.on('error', () => res.status(500).json({ error: 'FFmpeg not available' }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recordings/cleanup — Run cleanup for all cameras (admin only)
router.post('/cleanup', authenticate, authorize('admin'), async (_req, res) => {
  try {
    const result = await cleanupAllCameras();
    res.json({
      message: `Limpeza concluída: ${result.deleted} gravações removidas`,
      ...result,
      freed_mb: parseFloat((result.freed / 1024 / 1024).toFixed(1)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recordings/cleanup/:cameraId — Run cleanup for a specific camera (admin only)
router.post('/cleanup/:cameraId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await cleanupCamera(req.params.cameraId);
    res.json({
      message: `Limpeza concluída: ${result.deleted} gravações removidas`,
      ...result,
      freed_mb: parseFloat((result.freed / 1024 / 1024).toFixed(1)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
