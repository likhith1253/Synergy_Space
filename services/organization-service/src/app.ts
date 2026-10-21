import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
// @ts-ignore - Local module resolution
import { createLogger } from '@packages/logger';
import orgRoutes from './routes/org.routes';
import billingRoutes from './routes/billing.routes';
import { handleWebhook } from './controllers/billing.controller';
import { checkDatabaseHealth } from '@collab/database';

export const logger = createLogger('organization-service');
export const app = express();

app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true
}));
// Stripe webhook: needs the raw body for signature verification, so it must precede express.json()
app.post('/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());
app.use(morgan('combined'));

app.get('/health', async (req, res) => {
    const db = await checkDatabaseHealth();
    if (!db.ok) {
        res.status(503).json({
            status: 'degraded',
            service: 'organization-service',
            database: 'disconnected',
            error: db.error,
        });
        return;
    }

    res.status(200).json({
        status: 'ok',
        service: 'organization-service',
        database: 'connected',
    });
});

app.use('/', orgRoutes);
app.use('/billing', billingRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(err.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
});

