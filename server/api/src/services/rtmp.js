import crypto from 'crypto';

const RTMP_HOST = process.env.RTMP_HOST || 'nginx-rtmp';
const RTMP_PORT = process.env.RTMP_PORT || '1935';
const HLS_BASE_URL = process.env.HLS_BASE_URL || 'http://nginx-rtmp:8080/hls';

export function generateStreamKey() {
  return crypto.randomBytes(24).toString('base64url');
}

export function getRtmpUrl(streamKey) {
  return `rtmp://${RTMP_HOST}:${RTMP_PORT}/live/${streamKey}`;
}

export function getHlsUrl(streamKey) {
  return `${HLS_BASE_URL}/${streamKey}.m3u8`;
}
