#!/usr/bin/env node
/**
 * IoT Pilot Route Lister
 *
 * API routes — parsed from docs/openapi.yml (source of truth)
 * Page routes — scanned from apps/frontend/src/app (Next.js App Router)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');
const APP_DIR = path.join(__dirname, '../src/app');
const OPENAPI_FILE = path.join(ROOT, 'docs/openapi.yml');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  GET: '\x1b[32m',
  POST: '\x1b[34m',
  PUT: '\x1b[33m',
  PATCH: '\x1b[36m',
  DELETE: '\x1b[31m',
  PAGE: '\x1b[35m',
  TAG: '\x1b[90m',
};

// ─── OpenAPI YAML parser (no external deps) ──────────────────────────────────

function parseOpenAPIPaths(yamlContent) {
  const lines = yamlContent.split('\n');
  const routes = [];
  let inPaths = false;
  let currentPath = null;
  let currentMethod = null;
  let inTags = false;
  let inResponses = false;
  let summary = null;
  let tags = [];

  function flush() {
    if (currentPath && currentMethod) {
      routes.push({ path: currentPath, method: currentMethod.toUpperCase(), summary, tags: [...tags] });
    }
  }

  for (const line of lines) {
    if (/^[a-zA-Z]/.test(line)) {
      if (line.startsWith('paths:')) { inPaths = true; }
      else { flush(); inPaths = false; currentPath = null; currentMethod = null; }
      inTags = false; inResponses = false;
      continue;
    }

    if (!inPaths) continue;

    // Path entry: 2-space indent + /path:
    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) {
      flush();
      currentPath = pathMatch[1];
      currentMethod = null;
      summary = null;
      tags = [];
      inTags = false;
      inResponses = false;
      continue;
    }

    // HTTP method: 4-space indent
    const methodMatch = line.match(/^    (get|post|put|patch|delete):\s*$/);
    if (methodMatch) {
      flush();
      currentMethod = methodMatch[1];
      summary = null;
      tags = [];
      inTags = false;
      inResponses = false;
      continue;
    }

    if (!currentMethod) continue;

    if (/^      (parameters|requestBody|responses|security):/.test(line)) {
      inTags = false;
      inResponses = /responses/.test(line);
      continue;
    }
    if (inResponses) continue;

    const summaryMatch = line.match(/^      summary:\s*(.+)$/);
    if (summaryMatch) { summary = summaryMatch[1].trim(); continue; }

    // Inline array: `tags: [auth]` or `tags: [auth, devices]`
    const inlineTagMatch = line.match(/^      tags:\s*\[([^\]]+)\]/);
    if (inlineTagMatch) {
      tags = inlineTagMatch[1].split(',').map(t => t.trim());
      continue;
    }
    // Block array:  `tags:\n        - auth`
    if (/^      tags:\s*$/.test(line)) { inTags = true; continue; }
    if (inTags) {
      const tagMatch = line.match(/^        -\s*(.+)$/);
      if (tagMatch) { tags.push(tagMatch[1].trim()); continue; }
      inTags = false;
    }
  }

  flush();
  return routes;
}

// ─── Next.js page scanner ────────────────────────────────────────────────────

function scanPages(dir, base = '') {
  const pages = [];
  if (!fs.existsSync(dir)) return pages;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      let seg = entry.name;
      if (seg.startsWith('[') && seg.endsWith(']')) {
        const p = seg.slice(1, -1);
        seg = p.startsWith('...') ? `[...${p.slice(3)}]` : `{${p}}`;
      }
      pages.push(...scanPages(path.join(dir, entry.name), base + '/' + seg));
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      pages.push({ path: base || '/', file: path.relative(APP_DIR, path.join(dir, entry.name)) });
    }
  }
  return pages;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function colorMethod(m) {
  return `${C[m] || C.reset}${m.padEnd(6)}${C.reset}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log(`\n${C.bold}IoT Pilot — Route List${C.reset}\n`);

  // API Routes from OpenAPI spec
  if (!fs.existsSync(OPENAPI_FILE)) {
    console.log(`${C.dim}⚠  docs/openapi.yml not found — run: make openapi-update${C.reset}`);
  } else {
    const yaml = fs.readFileSync(OPENAPI_FILE, 'utf-8');
    const routes = parseOpenAPIPaths(yaml);

    const byTag = {};
    for (const r of routes) {
      const tag = r.tags[0] || 'other';
      (byTag[tag] = byTag[tag] || []).push(r);
    }

    const tagOrder = ['auth', 'devices', 'monitoring', 'admin', 'users', 'settings', 'notifications', 'iot', 'system'];
    const orderedTags = [...tagOrder.filter(t => byTag[t]), ...Object.keys(byTag).filter(t => !tagOrder.includes(t))];

    console.log(`${C.bold}API ROUTES  (docs/openapi.yml — ${routes.length} endpoints)${C.reset}`);

    for (const tag of orderedTags) {
      const group = byTag[tag];
      const maxPath = Math.max(32, ...group.map(r => r.path.length));
      console.log(`\n  ${C.TAG}[${tag}]${C.reset}`);
      for (const r of group) {
        const p = r.path.padEnd(maxPath);
        const sum = r.summary ? `${C.dim}${r.summary}${C.reset}` : '';
        console.log(`    ${colorMethod(r.method)}  ${p}  ${sum}`);
      }
    }

    console.log(`\n  ${C.bold}Total: ${routes.length} endpoints across ${orderedTags.length} tag groups${C.reset}`);
  }

  // Page routes from Next.js
  const pages = scanPages(APP_DIR).sort((a, b) => a.path.localeCompare(b.path));
  const sep = '─'.repeat(90);
  console.log(`\n${C.bold}PAGE ROUTES  (Next.js App Router — ${pages.length} pages)${C.reset}`);
  console.log(sep);
  console.log(`${'METHOD'.padEnd(8)}  ${'PATH'.padEnd(48)}  FILE`);
  console.log(sep);
  for (const p of pages) {
    console.log(`${C.PAGE}GET   ${C.reset}   ${p.path.padEnd(48)}  ${C.dim}${p.file}${C.reset}`);
  }
  console.log(`\n  ${C.bold}Total: ${pages.length} pages${C.reset}\n`);
}

main();
