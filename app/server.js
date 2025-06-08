const express = require('express');
const next = require('next');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Configure Winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'iotpilot-server' },
    transports: [
        new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: './logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Environment-aware CORS configuration - Web access only
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        process.env.DOMAIN_TUNEL, // CloudFlare tunnel only
    ].filter(Boolean)
    : [
        'http://iotpilotserver.test:9080',
        'https://iotpilotserver.test:9443',
        'https://dashboarddev.iotpilot.app' // CloudFlare tunnel for dev
    ];

app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);

    // Initialize Socket.IO with environment-aware CORS
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Trust proxy headers from Tailscale and Traefik
    server.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

    // Security middleware - Web access via CloudFlare + local dev only
    server.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: [
                    "'self'",
                    "ws:",
                    "wss:",
                    // CloudFlare tunnel URL
                    process.env.NEXT_PUBLIC_DOMAIN_TUNEL ? `https://${process.env.NEXT_PUBLIC_DOMAIN_TUNEL}` : null,
                    // Local development URLs - use same protocol
                    process.env.NODE_ENV !== 'production' ? 'https://iotpilotserver.test:9443' : null,
                    // Remove HTTP port 3001 for HTTPS connections
                ].filter(Boolean),
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    server.use(cors({
        origin: allowedOrigins,
        credentials: true
    }));

    // Compression middleware
    server.use(compression());

    // Middleware to log Tailscale headers (but don't parse body)
    server.use((req, res, next) => {
        const tailscaleHeaders = {
            user: req.get('X-Tailscale-User'),
            name: req.get('X-Tailscale-Name'),
            login: req.get('X-Tailscale-Login'),
            tailnet: req.get('X-Tailscale-Tailnet'),
            ip: req.get('X-Forwarded-For') || req.ip
        };

        if (tailscaleHeaders.user) {
            logger.info('Tailscale connection', {
                url: req.url,
                method: req.method,
                tailscale: tailscaleHeaders
            });
        }

        req.tailscale = tailscaleHeaders;
        next();
    });

    // IMPORTANT: Do NOT add express.json() here as it conflicts with Next.js API routes
    // Let Next.js handle all body parsing for API routes

    // Health check endpoint (custom Express route)
    server.get('/api/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            tailscale: {
                domain: process.env.TAILSCALE_DOMAIN,
                client: req.tailscale
            }
        });
    });

    // Socket.IO connection handling with Tailscale context
    io.on('connection', (socket) => {
        const clientInfo = {
            id: socket.id,
            ip: socket.handshake.address,
            tailscale: socket.handshake.headers['x-tailscale-user'] ? {
                user: socket.handshake.headers['x-tailscale-user'],
                name: socket.handshake.headers['x-tailscale-name'],
                login: socket.handshake.headers['x-tailscale-login']
            } : null
        };

        logger.info('Client connected', clientInfo);

        // Handle device status subscriptions
        socket.on('subscribe:devices', () => {
            socket.join('devices');
            logger.info(`Client ${socket.id} subscribed to device updates`);
        });

        // Handle Tailscale device connections
        socket.on('tailscale:device:connect', (data) => {
            const { deviceId, tailscaleInfo } = data;
            socket.join(`device:${deviceId}`);
            logger.info(`Tailscale device connected: ${deviceId}`, tailscaleInfo);
        });

        socket.on('disconnect', () => {
            logger.info(`Client disconnected: ${socket.id}`);
        });
    });

    // Global broadcast functions
    global.broadcastDeviceUpdate = (deviceId, update) => {
        io.to('devices').emit('device:update', { deviceId, update });
    };

    global.broadcastAlert = (alert) => {
        io.to('devices').emit('alert:new', alert);
    };

    // Rate limiting for API endpoints
    const rateLimit = require('express-rate-limit');
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 100 : 1000,
        message: {
            error: 'Too many requests from this IP, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        // Skip rate limiting for Tailscale authenticated requests
        skip: (req) => {
            return req.tailscale && req.tailscale.user;
        }
    });

    // Apply rate limiting to API routes (except auth routes)
    server.use('/api/', (req, res, next) => {
        // Skip rate limiting for auth routes to avoid login issues
        if (req.path.startsWith('/auth/')) {
            return next();
        }
        return apiLimiter(req, res, next);
    });

    // Handle all other routes with Next.js (including all API routes)
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    // Initialize command queue for device commands
    try {
        // Import the command queue
        const { commandQueue } = require('./src/lib/command-executor');

        // Start processing the command queue with a 60-second interval
        commandQueue.startQueueProcessing(60000);

        logger.info('Command queue processing started');
    } catch (error) {
        logger.error('Failed to initialize command queue:', error);
        // Continue server startup even if command queue fails
    }

    // Start the server
    httpServer.listen(port, (err) => {
        if (err) {
            logger.error('Failed to start server:', err);
            throw err;
        }

        logger.info(`IoT Pilot server is running on http://${hostname}:${port}`, {
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            hostname,
            port,
            tailscale: {
                domain: process.env.TAILSCALE_DOMAIN,
            }
        });
    });

}).catch((ex) => {
    logger.error('Failed to start application:', ex);
    process.exit(1);
});
