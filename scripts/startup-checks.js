#!/usr/bin/env node
/* Simple startup checks for production */
import { createRequire } from 'module';
import { execSync } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';
import path from 'node:path';

const require = createRequire(import.meta.url);
const dotenv = require('dotenv');

// Load .env if present
dotenv.config({ path: path.join(process.cwd(), '.env') });

const fail = (msg, code = 1) => {
  console.error(`[startup-checks] ${msg}`);
  process.exit(code);
};

// 1) Required envs
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
if (missing.length) fail(`Missing required env vars: ${missing.join(', ')}`);

// 2) Port availability
const port = parseInt(process.env.PORT || '3005', 10);
await new Promise((resolve) => {
  const srv = net.createServer();
  srv.once('error', () => fail(`Port ${port} is not available`));
  srv.once('listening', () => srv.close(resolve));
  srv.listen(port, '0.0.0.0');
});

// 3) DB reachability (best-effort, 3s timeout) using psql if available
try {
  execSync('which psql', { stdio: 'ignore' });
  const host = process.env.DB_HOST;
  const name = process.env.DB_NAME;
  const user = process.env.DB_USER;
  execSync(`PGPASSWORD="${process.env.DB_PASSWORD}" psql -h ${host} -U ${user} -d ${name} -c "SELECT 1" -t -A`, { stdio: 'ignore', timeout: 3000 });
} catch {
  // Non-fatal: continue, server has its own health gate
  console.warn('[startup-checks] Skipping DB connectivity verification (psql not available or timeout)');
}

console.log('[startup-checks] OK');

