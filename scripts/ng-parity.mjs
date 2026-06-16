#!/usr/bin/env node
/**
 * ng-parity — smoke-test both frontends side by side.
 *
 * Checks:
 *   1. Backend health endpoint
 *   2. All key routes return HTTP 200 on both legacy (port 3001) and Angular (port 4201)
 *
 * Exit 0 = all checks passed. Exit 1 = at least one failure.
 *
 * Run via: make ng-parity
 */

const BACKEND   = process.env.PARITY_BACKEND_URL   ?? 'http://localhost:3102';
const LEGACY    = process.env.PARITY_LEGACY_URL    ?? 'http://localhost:3001';
const ANGULAR   = process.env.PARITY_ANGULAR_URL   ?? 'http://localhost:4201';

const ROUTES = [
  '/',
  '/login',
  '/dashboard',
  '/devices',
  '/monitoring',
  '/admin',
  '/settings',
  '/settings/profile',
  '/settings/security',
  '/settings/notifications',
];

const GREEN  = '\x1b[32m✔\x1b[0m';
const RED    = '\x1b[31m✘\x1b[0m';
const YELLOW = '\x1b[33m⚠\x1b[0m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

let failures = 0;

async function check(label, url, expectedStatus = 200) {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    const ok  = res.status === expectedStatus;
    if (!ok) failures++;
    console.log(`  ${ok ? GREEN : RED} ${label.padEnd(52)} ${res.status}`);
    return ok;
  } catch (err) {
    failures++;
    console.log(`  ${RED} ${label.padEnd(52)} ERROR: ${err.message}`);
    return false;
  }
}

console.log(`\n${BOLD}IoT Pilot — Angular Migration Parity Check${RESET}`);
console.log('─'.repeat(60));

// ── Backend health ────────────────────────────────────────────
console.log(`\n${BOLD}Backend${RESET}  ${BACKEND}`);
const healthOk = await check('GET /api/health → {"status":"healthy"}', `${BACKEND}/api/health`);
if (healthOk) {
  const body = await fetch(`${BACKEND}/api/health`).then(r => r.json()).catch(() => null);
  if (body?.status !== 'healthy') {
    console.log(`  ${YELLOW} /api/health body unexpected: ${JSON.stringify(body)}`);
  }
}

// ── Legacy app (Next.js) ──────────────────────────────────────
console.log(`\n${BOLD}Legacy (Next.js)${RESET}  ${LEGACY}`);
for (const route of ROUTES) {
  await check(`GET ${route}`, `${LEGACY}${route}`);
}

// ── Angular app (Ionic) ───────────────────────────────────────
console.log(`\n${BOLD}Angular (Ionic)${RESET}  ${ANGULAR}`);
for (const route of ROUTES) {
  await check(`GET ${route}`, `${ANGULAR}${route}`);
}

// ── Summary ───────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
if (failures === 0) {
  console.log(`${GREEN} All checks passed\n`);
  process.exit(0);
} else {
  console.log(`${RED} ${failures} check(s) failed\n`);
  process.exit(1);
}
