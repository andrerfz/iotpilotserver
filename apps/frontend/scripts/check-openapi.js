#!/usr/bin/env node
/**
 * OpenAPI Sync Checker
 *
 * Extracts routes defined in apps/backend/src/routes/*.ts and compares them
 * against docs/openapi.yml. Reports routes missing from the spec and spec
 * paths that no longer have a matching implementation.
 *
 * Usage:
 *   node scripts/check-openapi.js           # show diff
 *   node scripts/check-openapi.js --strict  # exit 1 if any gap found
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const ROUTES_DIR = path.join(ROOT, 'apps/backend/src/routes');
const OPENAPI_FILE = path.join(ROOT, 'docs/openapi.yml');
const STRICT = process.argv.includes('--strict');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// ─── Prefix map from apps/backend/src/routes/index.ts ────────────────────────
// Keep in sync with createApiRouter() in index.ts.
// For routers mounted at multiple prefixes, list the canonical one first.

const PREFIX_MAP = {
  authRouter:          '/api/auth',
  devicesRouter:       '/api/devices',
  monitoringRouter:    '/api/monitoring',
  adminRouter:         '/api/admin',
  usersRouter:         '/api/users',
  settingsRouter:      '/api/settings',
  iotRouter:           '/api/iot',     // also mounted at /heartbeat and /webhook
  notificationsRouter: '/api/notifications',
};

// Additional prefixes for the same router (aliases).
// Routes at these prefixes are only used to satisfy spec paths — they
// won't appear as "missing from spec" if the route is already documented
// under its canonical path.
const ALIAS_PREFIXES = {
  iotRouter: ['/api/webhook'],
};

// ─── Extract routes from a router file ───────────────────────────────────────

function extractRoutes(filePath, prefix) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const routes = [];

  // Match: routerVar.METHOD('path', ...) or routerVar.METHOD("path", ...)
  const re = /\w+Router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    const rawPath = m[2];

    // Normalise Express params (:id) to OpenAPI style ({id})
    const normalized = (prefix + rawPath)
      .replace(/\/\//g, '/')
      .replace(/:(\w+)/g, '{$1}');

    routes.push({ method, path: normalized, raw: rawPath });
  }

  return routes;
}

// ─── Parse OpenAPI paths ──────────────────────────────────────────────────────

function parseOpenAPIPaths(yamlContent) {
  const lines = yamlContent.split('\n');
  const paths = new Set();
  let inPaths = false;

  for (const line of lines) {
    if (/^[a-zA-Z]/.test(line)) {
      inPaths = line.startsWith('paths:');
      continue;
    }
    if (!inPaths) continue;

    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) continue; // path entry handled below with methods

    const methodOnPath = line.match(/^  (\/[^:]+):\s*$/);
  }

  // Second pass: collect (method, path) pairs
  const routes = [];
  let inPathsSection = false;
  let currentPath = null;

  for (const line of lines) {
    if (/^[a-zA-Z]/.test(line)) {
      inPathsSection = line.startsWith('paths:');
      currentPath = null;
      continue;
    }
    if (!inPathsSection) continue;

    const pm = line.match(/^  (\/[^:]+):\s*$/);
    if (pm) { currentPath = pm[1]; continue; }

    if (!currentPath) continue;

    const mm = line.match(/^    (get|post|put|patch|delete):\s*$/);
    if (mm) { routes.push({ method: mm[1].toUpperCase(), path: currentPath }); }
  }

  return routes;
}

// ─── Normalise path for comparison ───────────────────────────────────────────

function normPath(p) {
  return p
    .replace(/^\/api/, '')      // strip /api prefix (spec omits it)
    .replace(/\/+$/, '')        // strip trailing slash
    .replace(/\/\//g, '/')      // collapse double slashes
    .replace(/\{[^}]+\}/g, '{*}'); // make all params generic
}

function routeKey(method, p) {
  return `${method} ${normPath(p)}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(OPENAPI_FILE)) {
    console.error(`${C.red}✗ docs/openapi.yml not found${C.reset}`);
    process.exit(1);
  }

  // Collect canonical implemented routes from router files
  const implemented = [];
  // Supplemental routes from alias mounts: used ONLY to satisfy spec paths
  const supplemental = [];
  const routerFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts') && f !== 'index.ts');

  for (const [varName, prefix] of Object.entries(PREFIX_MAP)) {
    for (const file of routerFiles) {
      const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf-8');
      if (content.includes(`export const ${varName}`)) {
        // Canonical prefix routes → check both directions
        const routes = extractRoutes(path.join(ROUTES_DIR, file), prefix);
        implemented.push(...routes);
        // Alias prefix routes → only used to satisfy "orphaned in spec" check
        for (const aliasPrefix of (ALIAS_PREFIXES[varName] || [])) {
          const aliasRoutes = extractRoutes(path.join(ROUTES_DIR, file), aliasPrefix);
          supplemental.push(...aliasRoutes);
        }
        break;
      }
    }
  }

  // Collect direct routes from server.ts (app.get/post at /api/*)
  const serverFile = path.join(ROOT, 'apps/backend/src/server.ts');
  if (fs.existsSync(serverFile)) {
    const content = fs.readFileSync(serverFile, 'utf-8');
    const re = /app\.(get|post|put|patch|delete)\s*\(\s*['"`](\/api\/[^'"`]+)['"`]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const method = m[1].toUpperCase();
      const path_ = m[2].replace(/:(\w+)/g, '{$1}');
      implemented.push({ method, path: path_, raw: m[2] });
    }
  }

  // Collect spec paths
  const yaml = fs.readFileSync(OPENAPI_FILE, 'utf-8');
  const specRoutes = parseOpenAPIPaths(yaml);

  // Build lookup sets (normalised)
  const implKeys = new Set(implemented.map(r => routeKey(r.method, r.path)));
  // Alias routes only contribute to satisfying spec paths (not to "missing from spec")
  const allImplKeys = new Set([...implemented, ...supplemental].map(r => routeKey(r.method, r.path)));
  const specKeys = new Set(specRoutes.map(r => routeKey(r.method, r.path)));

  // Find gaps
  const missingFromSpec = implemented.filter(r => !specKeys.has(routeKey(r.method, r.path)));
  const orphanedInSpec  = specRoutes.filter(r => !allImplKeys.has(routeKey(r.method, r.path)));

  console.log(`\n${C.bold}OpenAPI Sync Check${C.reset}`);
  console.log(`  Implemented routes : ${C.bold}${implemented.length}${C.reset}`);
  console.log(`  Spec paths         : ${C.bold}${specRoutes.length}${C.reset}\n`);

  let hasGap = false;

  if (missingFromSpec.length === 0) {
    console.log(`${C.green}✓ All implemented routes are documented in the spec${C.reset}`);
  } else {
    hasGap = true;
    console.log(`${C.red}✗ Routes implemented but NOT in docs/openapi.yml (${missingFromSpec.length}):${C.reset}`);
    for (const r of missingFromSpec) {
      console.log(`    ${C.yellow}${r.method.padEnd(7)}${C.reset} ${r.path}`);
    }
  }

  console.log('');

  if (orphanedInSpec.length === 0) {
    console.log(`${C.green}✓ All spec paths have a matching implementation${C.reset}`);
  } else {
    // Orphans are warnings only — spec may document upcoming routes
    console.log(`${C.yellow}⚠  Spec paths with no matching implementation (${orphanedInSpec.length}):${C.reset}`);
    for (const r of orphanedInSpec) {
      console.log(`    ${C.dim}${r.method.padEnd(7)}${C.reset} ${r.path}`);
    }
    console.log(`  ${C.dim}(These may be intentional — spec sometimes leads implementation)${C.reset}`);
  }

  console.log('');

  if (STRICT && hasGap) {
    console.error(`${C.red}✗ Strict mode: undocumented routes found. Update docs/openapi.yml.${C.reset}`);
    process.exit(1);
  }

  process.exit(0);
}

main();
