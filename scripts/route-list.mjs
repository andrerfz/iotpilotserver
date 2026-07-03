#!/usr/bin/env node
// Lists every Express route registered under /api, grouped by router file.
// Static parse (regex over source) — no server needs to be running.
// Keep MOUNTS in sync with apps/backend/src/routes/index.ts.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = join(__dirname, '..', 'apps', 'backend', 'src', 'routes');

const MOUNTS = [
  { prefix: '/api/auth', file: 'auth.router.ts' },
  { prefix: '/api/devices', file: 'devices.router.ts' },
  { prefix: '/api/monitoring', file: 'monitoring.router.ts' },
  { prefix: '/api/admin', file: 'admin.router.ts' },
  { prefix: '/api/users', file: 'users.router.ts' },
  { prefix: '/api/settings', file: 'settings.router.ts' },
  { prefix: '/api/iot', file: 'iot.router.ts' },
  { prefix: '/api/webhook', file: 'iot.router.ts' },
  { prefix: '/api/notifications', file: 'notifications.router.ts' },
];

const ROUTE_RE = /[a-zA-Z]+Router\.(get|post|put|patch|delete)\(\s*['"]([^'"]*)['"]/g;

function joinPath(prefix, sub) {
  const path = sub === '/' ? '' : sub;
  return `${prefix}${path}` || prefix;
}

const rows = [];
for (const { prefix, file } of MOUNTS) {
  const src = readFileSync(join(ROUTES_DIR, file), 'utf8');
  for (const m of src.matchAll(ROUTE_RE)) {
    rows.push({ method: m[1].toUpperCase(), path: joinPath(prefix, m[2]), file });
  }
}

rows.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

const methodW = Math.max(...rows.map(r => r.method.length), 6);
const pathW = Math.max(...rows.map(r => r.path.length), 4);

console.log(`${'METHOD'.padEnd(methodW)}  ${'PATH'.padEnd(pathW)}  FILE`);
console.log(`${'-'.repeat(methodW)}  ${'-'.repeat(pathW)}  ${'-'.repeat(10)}`);
for (const r of rows) {
  console.log(`${r.method.padEnd(methodW)}  ${r.path.padEnd(pathW)}  ${r.file}`);
}
console.log(`\n${rows.length} routes`);
