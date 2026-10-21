/**
 * Builds the HTTP + Socket.io server (no listening, no database bootstrap) so it can be tested.
 */

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger } from './logger';
import { healthCheck } from './health';
import { verifyAccessToken, extractTokenFromHandshake } from './utils/jwt';
import { AuthenticationError } from './utils/AppErrors';
import * as collabHandler from './handlers/collab.handler';

export function createCollabServer() {
    // ============================================================================
    // Express App Setup
    // ============================================================================

    const app = express();
    const server = http.createServer(app);

    // ============================================================================
    // Socket.io Server Setup
    // ============================================================================

    // Comma-separated allowlist in CORS_ORIGIN; unset reflects any origin (development only).
    // Auth is a bearer token in the handshake, not a cookie, so CORS is defence in depth here.
    const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
        : null;

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins ?? true,
            methods: ['GET', 'POST'],
            credentials: true
        },
        // Allow both WebSocket and polling transports
        transports: ['websocket', 'polling']
    });

    // ============================================================================
    // Middleware
    // ============================================================================

    app.use(helmet());
    app.use(cors({ origin: allowedOrigins ?? true }));
    app.use(express.json());
    app.use(morgan('combined'));

    // ============================================================================
    // Routes
    // ============================================================================

    app.get('/health', (req, res) => {
        void healthCheck(req, res);
    });

    // ============================================================================
    // Socket.io Authentication Middleware
    // ============================================================================

    /**
     * JWT Authentication Middleware for Socket.io
     * Verifies token on connection and attaches user data to socket
     */
    io.use((socket, next) => {
        try {
            // Extract token from handshake
            const token = extractTokenFromHandshake(socket.handshake);

            if (!token) {
                logger.warn(`Connection rejected: No token provided (socket: ${socket.id})`);
                return next(new AuthenticationError('Authentication required'));
            }

            // Verify token
            const decoded = verifyAccessToken(token);

            // Register socket with user data
            collabHandler.registerSocket(socket, decoded);

            logger.info(`User authenticated: ${decoded.email} (socket: ${socket.id})`);
            next();
        } catch (error) {
            if (error instanceof AuthenticationError) {
                logger.warn(`Connection rejected: ${error.message} (socket: ${socket.id})`);
                next(error);
            } else {
                logger.error('Unexpected authentication error:', error);
                next(new AuthenticationError('Authentication failed'));
            }
        }
    });

    // ============================================================================
    // Socket.io Connection Handler
    // ============================================================================

    io.on('connection', (socket) => {
        logger.info(`Client connected: ${socket.id}`);

        // Setup collaboration event handlers
        collabHandler.setupSocketHandlers(io, socket);

        // Handle errors
        socket.on('error', (error) => {
            logger.error(`Socket error (${socket.id}):`, error);
        });
    });


    return { app, server, io };
}
