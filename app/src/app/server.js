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

app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);

    // Initialize Socket.IO
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? [`https://${process.env.DOMAIN}`]
                : ["http://localhost:3000", "http://localhost:3001"],
            methods: ["GET", "POST"]
        }
    });

    // Security middleware
    server.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "ws:", "wss:"],
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
        origin: process.env.NODE_ENV === 'production'
            ? [`https://${process.env.DOMAIN}`]
            : true,
        credentials: true
    }));

    // Compression and parsing middleware
    server.use(compression());
    server.use(express.json({ limit: '50mb' }));
    server.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging middleware
    server.use((req, res, next) => {
        logger.info(`${req.method} ${req.url}`, {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
        next();
    });

    // Health check endpoint
    server.get('/api/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development'
        });
    });

    // Metrics endpoint for Prometheus
    server.get('/api/metrics', (req, res) => {
        const metrics = [];
        const memUsage = process.memoryUsage();

        // Application metrics
        metrics.push(`# HELP iotpilot_uptime_seconds Application uptime in seconds`);
        metrics.push(`# TYPE iotpilot_uptime_seconds counter`);
        metrics.push(`iotpilot_uptime_seconds ${process.uptime()}`);

        metrics.push(`# HELP iotpilot_memory_usage_bytes Memory usage in bytes`);
        metrics.push(`# TYPE iotpilot_memory_usage_bytes gauge`);
        metrics.push(`iotpilot_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}`);
        metrics.push(`iotpilot_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}`);
        metrics.push(`iotpilot_memory_usage_bytes{type="external"} ${memUsage.external}`);

        res.set('Content-Type', 'text/plain');
        res.send(metrics.join('\n'));
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.id}`);

        // Handle device status subscriptions
        socket.on('subscribe:devices', () => {
            socket.join('devices');
            logger.info(`Client ${socket.id} subscribed to device updates`);
        });

        socket.on('unsubscribe:devices', () => {
            socket.leave('devices');
            logger.info(`Client ${socket.id} unsubscribed from device updates`);
        });

        // Handle SSH terminal sessions
        socket.on('ssh:connect', async (data) => {
            const { deviceId, width, height } = data;
            logger.info(`SSH connection request for device: ${deviceId}`);

            try {
                // TODO: Implement SSH connection logic
                socket.emit('ssh:connected', { deviceId });
            } catch (error) {
                logger.error(`SSH connection failed for device ${deviceId}:`, error);
                socket.emit('ssh:error', {
                    error: 'Failed to establish SSH connection',
                    deviceId
                });
            }
        });

        socket.on('ssh:input', (data) => {
            const { deviceId, input } = data;
            // TODO: Send input to SSH session
        });

        socket.on('ssh:disconnect', (data) => {
            const { deviceId } = data;
            logger.info(`SSH disconnection for device: ${deviceId}`);
            // TODO: Clean up SSH session
        });

        socket.on('disconnect', () => {
            logger.info(`Client disconnected: ${socket.id}`);
        });
    });

    // Broadcast device updates via Socket.IO
    global.broadcastDeviceUpdate = (deviceId, update) => {
        io.to('devices').emit('device:update', { deviceId, update });
    };

    // Broadcast alerts via Socket.IO
    global.broadcastAlert = (alert) => {
        io.to('devices').emit('alert:new', alert);
    };

    // API routes for device heartbeat (custom handling for real-time updates)
    server.post('/api/devices/heartbeat', async (req, res) => {
        try {
            // Process heartbeat data
            const deviceData = req.body;

            // Broadcast real-time update
            if (global.broadcastDeviceUpdate) {
                global.broadcastDeviceUpdate(deviceData.device_id, {
                    status: 'ONLINE',
                    lastSeen: new Date().toISOString(),
                    metrics: {
                        cpuUsage: deviceData.cpu_usage,
                        memoryUsage: deviceData.memory_usage_percent,
                        cpuTemp: deviceData.cpu_temperature,
                        diskUsage: deviceData.disk_usage_percent
                    }
                });
            }

            // Let Next.js handle the actual processing
            return handle(req, res);
        } catch (error) {
            logger.error('Error processing heartbeat:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Rate limiting for API endpoints
    const rateLimit = require('express-rate-limit');
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests per windowMs
        message: {
            error: 'Too many requests from this IP, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

    // Apply rate limiting to API routes
    server.use('/api/', apiLimiter);

    // Error handling middleware
    server.use((error, req, res, next) => {
        logger.error('Unhandled error:', {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            ip: req.ip
        });

        if (res.headersSent) {
            return next(error);
        }

        res.status(500).json({
            error: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : error.message
        });
    });

    // Handle all other routes with Next.js
    server.all('*', (req, res) => {
        return handle(req, res);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);

        httpServer.close(() => {
            logger.info('HTTP server closed');

            // Close database connections, cleanup resources, etc.
            process.exit(0);
        });

        // Force close after 30 seconds
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });

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
            port
        });
    });

}).catch((ex) => {
    logger.error('Failed to start application:', ex);
    process.exit(1);
});