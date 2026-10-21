import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
// @ts-ignore - Local module resolution
import { createLogger } from '@packages/logger';
import { healthCheck } from './health';
import authRoutes from './routes/auth.routes';
import passwordResetRoutes from './routes/password-reset.routes';
import { errorHandler } from './middleware/error.middleware';
import { getPrismaClient, disconnectPrisma, initializeDatabase, checkDatabaseHealth } from '@collab/database';
import { seedDemoWorkspace } from './utils/demo-seeder';
import { resolveClientIp } from './middleware/rate-limit.middleware';

const logger = createLogger('auth-service');
console.log('Auth Service: Starting execution...');
logger.info('Auth Service: Logger initialized');

const app = express();
const prisma = getPrismaClient();

app.set('trust proxy', true);

app.use((req, res, next) => {
    const requestId = Math.random().toString(36).substring(7);
    const resolvedIp = resolveClientIp(req);
    (req as any).requestId = requestId;
    (req as any).resolvedClientIp = resolvedIp;
    next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('combined'));

app.get('/health', (req, res) => { void healthCheck(req, res); });

app.get('/ready', async (req, res) => {
    const db = await checkDatabaseHealth();
    const isReady = db.ok;
    res.status(isReady ? 200 : 503).json({ 
        status: isReady ? 'ready' : 'not_ready', 
        service: 'auth-service',
        database: isReady ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

app.get('/live', (req, res) => res.status(200).json({ status: 'live' }));
app.use('/', authRoutes);
app.use('/', passwordResetRoutes);
app.use(errorHandler);

const startServer = async () => {
    // Retry Loop for Database Initialization (Fixes Cold Boot crashes)
    let dbStatus;
    for (let i = 1; i <= 5; i++) {
        dbStatus = await initializeDatabase('auth-service');
        if (dbStatus.connected) break;
        logger.warn(`Database not ready, retrying in 5s... (Attempt ${i}/5)`);
        await new Promise(res => setTimeout(res, 5000));
    }

    if (!dbStatus?.connected) {
        logger.error(`Failed to start server completely: ${dbStatus?.error}`);
        process.exit(1);
    }

    // The demo workspace (a pre-provisioned owner account) is only created when demo mode is enabled
    const demoEnabled = process.env.ENABLE_DEMO_MODE === 'true';
    for (let i = 1; demoEnabled && i <= 3; i++) {
        try {
            await seedDemoWorkspace(prisma);
            logger.info('Demo workspace seeded successfully.');
            break;
        } catch (err: any) {
            logger.warn(`Failed to seed demo workspace, retrying in 3s... (Attempt ${i}/3): ${err.message}`);
            await new Promise(res => setTimeout(res, 3000));
        }
    }

    app.listen(config.port, () => {
        logger.info(`Auth Service running on port ${config.port} | ENV: ${config.nodeEnv}`);
    });
};

const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await disconnectPrisma();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();



