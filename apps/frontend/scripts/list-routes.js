#!/usr/bin/env node

/**
 * Next.js Route Lister - Similar to Laravel's route:list
 *
 * Lists all routes (pages and API endpoints) in the Next.js app
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '../src/app');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function getHttpMethods(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const methods = [];

    if (content.match(/export\s+async\s+function\s+GET/)) methods.push('GET');
    if (content.match(/export\s+async\s+function\s+POST/)) methods.push('POST');
    if (content.match(/export\s+async\s+function\s+PUT/)) methods.push('PUT');
    if (content.match(/export\s+async\s+function\s+PATCH/)) methods.push('PATCH');
    if (content.match(/export\s+async\s+function\s+DELETE/)) methods.push('DELETE');

    return methods.length > 0 ? methods : ['GET'];
  } catch (error) {
    return ['GET'];
  }
}

function findRoutes(dir, baseRoute = '') {
  const routes = [];

  if (!fs.existsSync(dir)) {
    return routes;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(APP_DIR, fullPath);

    if (entry.isDirectory()) {
      // Handle dynamic routes [id] or [...slug]
      let routeSegment = entry.name;
      if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
        const paramName = entry.name.slice(1, -1);
        if (paramName.startsWith('...')) {
          routeSegment = `[...${paramName.slice(3)}]`; // catch-all
        } else {
          routeSegment = `{${paramName}}`; // dynamic
        }
      }

      const newBaseRoute = baseRoute + '/' + routeSegment;
      routes.push(...findRoutes(fullPath, newBaseRoute));
    } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      // API route
      const route = baseRoute || '/';
      const methods = getHttpMethods(fullPath);
      routes.push({
        type: 'API',
        methods,
        path: route,
        file: relativePath,
      });
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      // Page route
      const route = baseRoute || '/';
      routes.push({
        type: 'PAGE',
        methods: ['GET'],
        path: route,
        file: relativePath,
      });
    }
  }

  return routes;
}

function formatMethod(method) {
  const methodColors = {
    GET: colors.green,
    POST: colors.blue,
    PUT: colors.yellow,
    PATCH: colors.cyan,
    DELETE: colors.magenta,
  };

  const color = methodColors[method] || colors.reset;
  return `${color}${method.padEnd(6)}${colors.reset}`;
}

function printRoutes() {
  console.log(`\n${colors.bright}${colors.cyan}IoT Pilot - Route List${colors.reset}\n`);

  const routes = findRoutes(APP_DIR);

  // Sort routes by path
  routes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'PAGE' ? -1 : 1;
    }
    return a.path.localeCompare(b.path);
  });

  // Group by type
  const pageRoutes = routes.filter(r => r.type === 'PAGE');
  const apiRoutes = routes.filter(r => r.type === 'API');

  // Print Page Routes
  console.log(`${colors.bright}${colors.yellow}PAGE ROUTES (${pageRoutes.length})${colors.reset}`);
  console.log(`${'─'.repeat(100)}`);
  console.log(`${'METHOD'.padEnd(8)} ${'PATH'.padEnd(50)} FILE`);
  console.log(`${'─'.repeat(100)}`);

  for (const route of pageRoutes) {
    const methodStr = route.methods.map(formatMethod).join(' ');
    console.log(`${methodStr} ${route.path.padEnd(50)} ${colors.cyan}${route.file}${colors.reset}`);
  }

  // Print API Routes
  console.log(`\n${colors.bright}${colors.yellow}API ROUTES (${apiRoutes.length})${colors.reset}`);
  console.log(`${'─'.repeat(100)}`);
  console.log(`${'METHOD'.padEnd(8)} ${'PATH'.padEnd(50)} FILE`);
  console.log(`${'─'.repeat(100)}`);

  for (const route of apiRoutes) {
    const methodStr = route.methods.map(formatMethod).join(' ');
    console.log(`${methodStr} ${route.path.padEnd(50)} ${colors.cyan}${route.file}${colors.reset}`);
  }

  console.log(`\n${colors.bright}Total Routes: ${routes.length}${colors.reset} (${pageRoutes.length} pages, ${apiRoutes.length} API endpoints)\n`);
}

// Run the script
printRoutes();
