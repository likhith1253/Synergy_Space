import { config } from './config';
import { app, logger } from './app';
import { initializeDatabase, disconnectPrisma } from '@collab/database';

const startServer = async () => {
    const dbStatus = await initializeDatabase('organization-service');

    if (!dbStatus.connected) {
        logger.error(`Failed to start server: ${dbStatus.error}`);
        process.exit(1);
    }

    app.listen(config.port, () => {
        logger.info(`Organization Service running on port ${config.port}`);
        logger.info(`Database host: ${dbStatus.host}:${dbStatus.port}`);
        logger.info('Registered routes: POST /, GET /me, GET /:id, POST /:id/members, /billing/*');
    });
};

process.on('SIGTERM', async () => {
    await disconnectPrisma();
    process.exit(0);
});

startServer();


