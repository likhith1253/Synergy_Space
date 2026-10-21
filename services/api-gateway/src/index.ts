import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from './config';
// @ts-ignore - Local module resolution
import { createLogger } from '@packages/logger';

const app = express();
const logger = createLogger('api-gateway');

// Trust only the configured number of reverse-proxy hops (Render/Vercel terminate TLS in front of us).
// Client-controlled headers such as CF-Connecting-IP / X-Real-IP / X-Original-Client-IP are NOT trusted:
// they are overwritten below with the address Express derives from the trusted hops.
app.set('trust proxy', config.trustProxyHops);

// Pre-middleware to resolve Client IP and Request ID early
app.use((req: any, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    // Request ids are for log correlation only; accept a well-formed one, otherwise generate our own
    const incomingId = req.headers['x-request-id'];
    const requestId = typeof incomingId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(incomingId)
        ? incomingId
        : Math.random().toString(36).substring(2, 10);

    req.resolvedClientIp = clientIp;
    req.requestId = requestId;

    // Overwrite (never append to) the headers downstream services read
    req.headers['x-original-client-ip'] = clientIp;
    req.headers['x-forwarded-for'] = clientIp;
    req.headers['x-real-ip'] = clientIp;
    req.headers['x-request-id'] = requestId;

    next();
});

// Middleware
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        // Non-browser clients send no Origin header; browsers must match the allowlist
        if (!origin || config.cors.allowedOrigins === '*' || config.cors.allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(null, false);
    },
    credentials: true
}));
app.use(morgan('dev'));

// Health Checks
app.get('/health', async (req, res) => {
    let databaseStatus = 'disconnected';
    let redisStatus = 'not_configured';
    let authServiceStatus = 'down';

    try {
        const response = await fetch(`${config.services.auth.url}/health`);
        if (response.ok) {
            const data: any = await response.json();
            authServiceStatus = 'up';
            databaseStatus = data.database || 'unknown';
            redisStatus = data.redis || 'not_configured';
        }
    } catch (error: any) {
        logger.error(`Health check failed to contact Auth Service: ${error.message}`);
    }

    const isOk = authServiceStatus === 'up' && databaseStatus === 'connected';
    res.status(isOk ? 200 : 503).json({
        status: isOk ? 'ok' : 'degraded',
        service: 'api-gateway',
        database: databaseStatus,
        redis: redisStatus,
        version: '1.0.0',
        uptime: process.uptime(),
        details: {
            authService: authServiceStatus
        }
    });
});

app.get('/ready', (req, res) => {
    res.status(200).json({ 
        status: 'ready', 
        service: 'api-gateway',
        version: '1.0.0',
        uptime: process.uptime()
    });
});

app.get('/live', (req, res) => {
    res.status(200).json({ 
        status: 'live', 
        service: 'api-gateway',
        version: '1.0.0',
        uptime: process.uptime()
    });
});

// Helper for standard proxy config
const getProxyOptions = (targetUrl: string, serviceName: string, overrides: Partial<Options> = {}): Options => {
    return {
        target: targetUrl,
        changeOrigin: true,
        ...overrides,
        on: {
            proxyReq: (proxyReq, req: any, res) => {
                const clientIp = req.resolvedClientIp || 'unknown';
                const requestId = req.requestId || 'unknown';

                proxyReq.setHeader('X-Forwarded-For', clientIp);
                proxyReq.setHeader('X-Real-IP', clientIp);
                proxyReq.setHeader('X-Original-Client-IP', clientIp);
                proxyReq.setHeader('X-Request-ID', requestId);

                if (overrides.on?.proxyReq) {
                    (overrides.on.proxyReq as any)(proxyReq, req, res);
                } else {
                    logger.info(`Proxying ${serviceName} Request: ${req.method} ${req.originalUrl} -> ${targetUrl}${req.path} | ClientIP: ${clientIp} | RequestID: ${requestId}`);
                }
            },
            proxyRes: (proxyRes, req: any, res) => {
                if (proxyRes.statusCode === 429) {
                    logger.warn(`${serviceName} upstream returned 429 for ${req.method} ${req.originalUrl}`);
                }
                if (overrides.on?.proxyRes) {
                    overrides.on.proxyRes(proxyRes, req, res);
                }
            },
            error: (err, req, res) => {
                logger.error(`${serviceName} Proxy Error: ${err.message}`);
                if (overrides.on?.error) {
                    overrides.on.error(err, req, res);
                } else {
                    (res as any).status(502).json({ error: 'Bad Gateway', message: `${serviceName} Service unavailable` });
                }
            }
        }
    } as any;
};

// AI Service Proxy
app.use('/ai', createProxyMiddleware(getProxyOptions(`${config.services.ai.url}/ai`, 'AI')) as unknown as express.RequestHandler);

// Auth Service Proxy - FIXED: Strips out the leading '/auth' prefix so it maps to the Auth Service endpoints correctly
app.use('/auth', createProxyMiddleware(getProxyOptions(config.services.auth.url, 'Auth', {
    pathRewrite: {
        '^/auth': '',
    }
})) as unknown as express.RequestHandler);

// Org Service Proxy (also accepts legacy /organizations prefix)
app.use('/organizations', createProxyMiddleware(getProxyOptions(config.services.org.url, 'Organizations', {
    pathRewrite: {
        '^/organizations/me': '/me',
        '^/organizations': '',
    }
})) as unknown as express.RequestHandler);

// Org Service Proxy
app.use('/orgs', createProxyMiddleware(getProxyOptions(config.services.org.url, 'Org', {
    on: {
        proxyRes: (proxyRes) => {
            delete proxyRes.headers['access-control-allow-origin'];
            delete proxyRes.headers['access-control-allow-credentials'];
            delete proxyRes.headers['access-control-allow-methods'];
            delete proxyRes.headers['access-control-allow-headers'];
        }
    }
})) as unknown as express.RequestHandler);

// Billing Service Proxy (Consolidated)
app.use('/billing', createProxyMiddleware(getProxyOptions(`${config.services.org.url}/billing`, 'Billing')) as unknown as express.RequestHandler);

// Document Service Proxy - Projects
app.use('/projects', createProxyMiddleware(getProxyOptions(`${config.services.docs.url}/projects`, 'Projects', {
    on: {
        proxyRes: (proxyRes) => {
            delete proxyRes.headers['access-control-allow-origin'];
            delete proxyRes.headers['access-control-allow-credentials'];
        }
    }
})) as unknown as express.RequestHandler);

// Document Service Proxy - Documents
app.use('/documents', createProxyMiddleware(getProxyOptions(`${config.services.docs.url}/documents`, 'Documents', {
    on: {
        proxyRes: (proxyRes) => {
            delete proxyRes.headers['access-control-allow-origin'];
            delete proxyRes.headers['access-control-allow-credentials'];
        }
    }
})) as unknown as express.RequestHandler);

// Document Service Proxy - Slides
app.use('/slides', createProxyMiddleware(getProxyOptions(`${config.services.docs.url}/slides`, 'Slides')) as unknown as express.RequestHandler);

// Document Service Proxy - Canvas
app.use('/canvas', createProxyMiddleware(getProxyOptions(config.services.docs.url, 'Canvas', {
    pathRewrite: {
        '^/canvas/projects': '/projects',
        '^/canvas/canvas': '/canvas',
        '^/canvas': '/canvas'
    }
})) as unknown as express.RequestHandler);

// Add error handling for canvas routes that return HTML
app.use('/canvas/*', (req, res, next) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Canvas endpoint not found'
        }
    });
});

// Document Service Proxy - Invites
app.use('/invites', createProxyMiddleware(getProxyOptions(config.services.docs.url, 'Invites')) as unknown as express.RequestHandler);

// Document Service Proxy - Presentations
app.use('/presentations', createProxyMiddleware(getProxyOptions(`${config.services.docs.url}/presentations`, 'Presentations')) as unknown as express.RequestHandler);

// Collab Service Proxy
app.use('/collab', createProxyMiddleware(getProxyOptions(config.services.collab?.url || 'http://localhost:3003', 'Collab')) as unknown as express.RequestHandler);

// Socket.io Proxy
app.use('/socket.io', createProxyMiddleware(getProxyOptions(config.services.collab?.url || 'http://localhost:3003', 'Socket.io', {
    ws: true,
    on: {
        proxyReq: (proxyReq, req: any) => {
            if (!req.url.includes('transport=websocket')) {
                logger.info(`Proxying Socket.io: ${req.url}`);
            }
        }
    }
})) as unknown as express.RequestHandler);

// Global Error Handler - Forcibly converts any microservice crash text into a clean JSON data structure
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`[API Gateway Exception Intercepted]: ${err.message}`);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

// Start Server
app.listen(config.port, () => {
    logger.info(`API Gateway running on port ${config.port}`);
    logger.info(`Proxying /auth -> ${config.services.auth.url}`);
    logger.info(`Proxying /orgs -> ${config.services.org.url}`);
    logger.info(`Proxying /collab -> ${config.services.collab.url}`);
    logger.info(`Proxying /ai -> ${config.services.ai.url}`);
    logger.info(`Proxying /documents -> ${config.services.docs.url}`);
    logger.info('Startup health checks disabled to avoid Render 429 rate limits during redeploy. Use GET /debug-network for manual checks.');
});




