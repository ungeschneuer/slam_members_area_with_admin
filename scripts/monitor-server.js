#!/usr/bin/env node
import http from 'node:http';

const HOST = process.env.MONITOR_HOST || '127.0.0.1';
const PORT = parseInt(process.env.PORT || '3005', 10);
const PATH = process.env.MONITOR_PATH || '/ready';

const req = http.request({ host: HOST, port: PORT, path: PATH, timeout: 3000 }, (res) => {
  if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
    console.log(`[monitor] OK ${res.statusCode}`);
    process.exit(0);
  } else {
    console.error(`[monitor] Not ready: ${res.statusCode}`);
    process.exit(2);
  }
});

req.on('timeout', () => {
  console.error('[monitor] Timeout');
  req.destroy();
  process.exit(3);
});

req.on('error', (err) => {
  console.error('[monitor] Error', err.message);
  process.exit(4);
});

req.end();

