import 'reflect-metadata';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { createApiRouter } from './routes/index';
import { RedisConnectionFactory } from '@iotpilot/core/shared/infrastructure/redis/redis-connection.factory';
import { RateLimitRedisStore } from '@iotpilot/core/shared/infrastructure/redis/rate-limit-redis-store';

const port = parseInt(process.env.PORT || '3100', 10);
const hostname = process.env.HOSTNAME || 'localhost';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'iotpilot-backend' },
  transports: [
    new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: './logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [process.env.DOMAIN_TUNEL].filter(Boolean) as string[]
    : [
        'http://iotpilotserver.test:9080',
        'https://iotpilotserver.test:9443',
        'https://dashboarddev.iotpilot.app',
        'http://localhost:3000',
        'http://localhost:3001',
      ];

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});

app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// Backend CSP. This app only serves JSON (the /api/* surface) plus the OpenAPI
// documents — none of which execute scripts — so the policy is strict: no
// 'unsafe-inline', no 'unsafe-eval'. The Angular SPA is served by nginx and
// carries its own CSP (see infra/nginx/frontend-ng.conf). The Bull Board admin
// UI is the one HTML surface here and gets a relaxed CSP scoped to its own
// mount, below.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'", 'ws:', 'wss:',
          process.env.NEXT_PUBLIC_DOMAIN_TUNEL
            ? `https://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}`
            : null,
          process.env.NODE_ENV !== 'production' ? 'https://iotpilotserver.test:9443' : null,
        ].filter(Boolean) as string[],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Tailscale header logging
app.use((req, res, next) => {
  const ts = {
    user: req.get('X-Tailscale-User'),
    name: req.get('X-Tailscale-Name'),
    login: req.get('X-Tailscale-Login'),
    tailnet: req.get('X-Tailscale-Tailnet'),
    ip: req.get('X-Forwarded-For') || req.ip,
  };
  if (ts.user) logger.info('Tailscale connection', { url: req.url, method: req.method, tailscale: ts });
  (req as any).tailscale = ts;
  next();
});

// Health check (no auth)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    tailscale: { domain: process.env.TAILSCALE_DOMAIN },
  });
});

// Schedule list endpoint
app.get('/api/schedule', async (req, res) => {
  try {
    const { JobWorkerBootstrap } = await import(
      '../../../packages/core/src/shared/infrastructure/queue/job-worker-bootstrap'
    );
    const bootstrap = JobWorkerBootstrap.getInstance();
    const jobs = await bootstrap.getScheduledJobs();
    res.json({
      tasks: jobs.map((j: any) => ({
        name: j.name,
        schedule: j.pattern,
        nextRun: j.next ? j.next.toISOString() : null,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({ tasks: [], error: (err as Error).message, timestamp: new Date().toISOString() });
  }
});

// Rate limiting — backed by Redis so limits survive restarts and work across replicas
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// A client-supplied X-Tailscale-* header must NOT, on its own, grant a
// rate-limit bypass — it is trivially spoofable by anyone hitting the API
// directly. We only treat a request as Tailscale-sourced when its
// (proxy-derived) source IP actually falls inside Tailscale's 100.64.0.0/10
// CGNAT range AND it carries the identifying header. Fail-closed: if the IP
// cannot be verified, the request is rate-limited normally.
function isTailscaleSourced(req: express.Request): boolean {
  if (!req.get('X-Tailscale-User')) return false;
  const raw = (req.ip ?? '').replace(/^::ffff:/, '');
  const m = raw.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a === 100 && b >= 64 && b <= 127; // 100.64.0.0/10
}

interface LimiterOptions {
  max: number;
  prefix: string;
  skipTailscale?: boolean;
  skipSuccessfulRequests?: boolean;
}

function buildRateLimiter(opts: LimiterOptions) {
  const base: Parameters<typeof rateLimit>[0] = {
    windowMs: RATE_WINDOW_MS,
    max: opts.max,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    ...(opts.skipTailscale ? { skip: (req: express.Request) => isTailscaleSourced(req) } : {}),
    ...(opts.skipSuccessfulRequests ? { skipSuccessfulRequests: true } : {}),
  };
  try {
    const redis = RedisConnectionFactory.getInstance().getGeneralConnection();
    const store = new RateLimitRedisStore(redis, RATE_WINDOW_MS, opts.prefix);
    return rateLimit({ ...base, store });
  } catch (err) {
    // Fallback to in-memory if Redis is unavailable at boot
    console.warn(`[RateLimit] Redis store unavailable for ${opts.prefix}, falling back to in-memory store:`, (err as Error).message);
    return rateLimit(base);
  }
}

// General API limiter — generous; verified Tailscale-sourced traffic is exempt
// so the device fleet is not throttled.
const apiLimiter = buildRateLimiter({
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  prefix: 'rl:',
  skipTailscale: true,
});

// Auth limiter — strict brute-force / credential-stuffing protection for the
// unauthenticated entry points. NEVER bypassed (no Tailscale skip): a spoofed
// header must not open login / registration / 2FA to unlimited guessing.
// skipSuccessfulRequests means only failed attempts count, so legitimate
// logins are never throttled.
const authLimiter = buildRateLimiter({
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  prefix: 'rl:auth:',
  skipSuccessfulRequests: true,
});

// Mount the strict limiter on the brute-forceable auth entry points, before the
// general limiter. The general '/api/' limiter continues to skip everything
// under '/auth/', so these endpoints are covered by the auth limiter alone.
app.use(
  ['/api/auth/login', '/api/auth/register', '/api/auth/verify-2fa', '/api/settings/security/2fa'],
  authLimiter,
);

app.use('/api/', (req, res, next) => {
  if (req.path.startsWith('/auth/')) return next();
  return apiLimiter(req, res, next);
});

// Mount all API routes
app.use('/api', createApiRouter());

// 404 catch-all for unknown API routes — must come after all route handlers
app.use('/api', (_req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
  });
});

// Socket.IO
// Authenticate every socket connection at the handshake. The client sends the
// session token in the auth payload (io(url, { auth: { token } })) — NOT a
// cookie, so mobile WebViews work too. We validate it exactly like the HTTP
// auth middleware (signed JWT + live session row) and tenant-scope the socket.
io.use(async (socket: Socket, nextFn: (err?: Error) => void) => {
  try {
    const { resolveUser } = await import('./middleware/auth.middleware');
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers['authorization'] as string | undefined)?.replace('Bearer ', '');

    if (!token) {
      nextFn(new Error('Authentication required'));
      return;
    }

    const user = await resolveUser(token);
    if (!user) {
      nextFn(new Error('Invalid or expired session'));
      return;
    }

    socket.data.user = user;
    nextFn();
  } catch {
    nextFn(new Error('Authentication error'));
  }
});

io.on('connection', (socket: Socket) => {
  const user = socket.data.user as { id: string; role: string; customerId?: string | null };

  // Tenant-scope the socket: alerts are emitted only to the customer's room.
  // SUPERADMIN has no customerId and joins no tenant room (no tenant alerts).
  if (user.customerId) {
    socket.join(`tenant:${user.customerId}`);
  }
  logger.info('Client connected', { id: socket.id, userId: user.id, customerId: user.customerId });

  socket.on('subscribe:devices', () => {
    socket.join('devices');
    logger.info(`Client ${socket.id} subscribed to device updates`);
  });

  socket.on('tailscale:device:connect', ({ deviceId, tailscaleInfo }) => {
    socket.join(`device:${deviceId}`);
    logger.info(`Tailscale device connected: ${deviceId}`, tailscaleInfo);
  });

  socket.on('disconnect', () => logger.info(`Client disconnected: ${socket.id}`));
});

(global as any).broadcastDeviceUpdate = (deviceId: string, update: unknown) =>
  io.to('devices').emit('device:update', { deviceId, update });

// Emit only to the alert's tenant room so alerts never leak across customers.
(global as any).broadcastAlert = (alert: { customerId?: string | null } & Record<string, unknown>) => {
  if (alert?.customerId) {
    io.to(`tenant:${alert.customerId}`).emit('alert:new', alert);
  }
};

// Bull Board dashboard
setTimeout(async () => {
  try {
    const { createBullBoardRouter } = await import(
      '../../../packages/core/src/shared/infrastructure/queue/bull-board'
    );
    const { authMiddleware } = await import('./middleware/auth.middleware');

    // Bull Board ships its own bundled UI (same-origin JS/CSS) plus a Google
    // Fonts stylesheet. Its scripts are same-origin so 'self' is enough, but it
    // needs the font origins and inline styles. Scope this relaxed CSP to the
    // dashboard route only — it overrides the strict global API policy here
    // without loosening it anywhere else.
    const bullBoardCsp = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    });

    if (process.env.NODE_ENV !== 'production') {
      // Development: open access (no real sessions to validate locally)
      app.use('/admin/queues', bullBoardCsp, createBullBoardRouter());
    } else {
      // Production: require SUPERADMIN session — Tailscale headers are not trusted
      app.use('/admin/queues', bullBoardCsp, authMiddleware({ requiredRole: 'SUPERADMIN' }), createBullBoardRouter());
    }
    logger.info('[BullBoard] Dashboard mounted at /admin/queues');
  } catch (err) {
    logger.warn('Bull Board initialization failed:', (err as Error).message);
  }
}, 1000);

// Command queue service
setTimeout(async () => {
  try {
    const { CommandQueueService } = await import(
      '../../../packages/core/src/device/application/services/command-queue.service'
    );
    const { ServiceContainer } = await import(
      '../../../packages/core/src/shared/infrastructure/container/service-container'
    );
    const sc = ServiceContainer.getInstance();
    const cq = CommandQueueService.getInstance(
      sc.getDeviceRepository(),
      sc.getDeviceCommandRepository(),
    );
    cq.startQueueProcessing(60000);
    logger.info('Command queue processing started');
  } catch (err) {
    logger.warn('Command queue initialization failed:', (err as Error).message);
  }
}, 3000);

httpServer.listen(port, (err?: Error) => {
  if (err) { logger.error('Failed to start server:', err); throw err; }
  logger.info(`IoT Pilot backend running on http://${hostname}:${port}`, {
    environment: process.env.NODE_ENV || 'development',
    port,
    hostname,
  });
});

const gracefulShutdown = async () => {
  logger.info('Backend shutting down...');
  httpServer.close();
  process.exit(0);
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
