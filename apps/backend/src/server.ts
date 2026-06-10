import 'reflect-metadata';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { createApiRouter } from './routes/index';

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

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
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

// Rate limiting (skip for Tailscale users)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !!(req as any).tailscale?.user,
});

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
io.on('connection', (socket) => {
  const clientInfo = {
    id: socket.id,
    ip: socket.handshake.address,
    tailscale: socket.handshake.headers['x-tailscale-user']
      ? {
          user: socket.handshake.headers['x-tailscale-user'],
          name: socket.handshake.headers['x-tailscale-name'],
          login: socket.handshake.headers['x-tailscale-login'],
        }
      : null,
  };
  logger.info('Client connected', clientInfo);

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
(global as any).broadcastAlert = (alert: unknown) => io.to('devices').emit('alert:new', alert);

// Bull Board dashboard
setTimeout(async () => {
  try {
    const { createBullBoardRouter } = await import(
      '../../../packages/core/src/shared/infrastructure/queue/bull-board'
    );
    const { authMiddleware } = await import('./middleware/auth.middleware');
    if (process.env.NODE_ENV !== 'production') {
      // Development: open access (no real sessions to validate locally)
      app.use('/admin/queues', createBullBoardRouter());
    } else {
      // Production: require SUPERADMIN session — Tailscale headers are not trusted
      app.use('/admin/queues', authMiddleware({ requiredRole: 'SUPERADMIN' }), createBullBoardRouter());
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
