/**
 * Collaboration Service Entry Point
 * Socket.io server for realtime relay of document/slide/canvas updates, presence and chat.
 *
 * Responsibilities:
 * - Socket.io server with JWT authentication (see server.ts)
 * - Per-room authorization against project membership (see handlers/collab.handler.ts)
 * - Database bootstrap and graceful shutdown
 *
 * Content is relayed between clients; the server does not merge or persist it
 * (persistence is via the document-service REST API).
 */

import { config } from './config';
import { logger } from './logger';
import { createCollabServer } from './server';
import * as collabHandler from './handlers/collab.handler';
import { disconnectPrisma, initializeDatabase } from '@collab/database';

const { server, io } = createCollabServer();

// ============================================================================
// Server Startup
// ============================================================================

const startServer = async () => {
    try {
        const dbStatus = await initializeDatabase('collab-service');

        if (!dbStatus.connected) {
            logger.error(`Failed to start server: ${dbStatus.error}`);
            process.exit(1);
        }

        server.listen(config.port, () => {
            logger.info(`Collab Service (Socket.io) running on port ${config.port}`);
            logger.info(`Environment: ${config.nodeEnv}`);
            logger.info(`WebSocket path: /socket.io`);
            logger.info(`Collab service URL target: ${process.env.COLLAB_SERVICE_URL || 'local'}`);
            logger.info(`Database host: ${dbStatus.host}:${dbStatus.port}`);
            logger.info('Registered events: join-document, leave-document, yjs-update, join-organization');
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// ============================================================================
// Graceful Shutdown
// ============================================================================

const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
        logger.info('HTTP server closed');
    });

    // Close all Socket.io connections
    io.close(() => {
        logger.info('Socket.io server closed');
    });

    // Save pending documents and cleanup
    await collabHandler.shutdown();
    await disconnectPrisma();

    logger.info('Graceful shutdown complete');
    process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();
