/**
 * JWT Utility Functions for Collab Service
 * Token verification only - generation is handled by auth-service
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError } from './AppErrors';

/**
 * Token payload interface
 * Must match the structure used by auth-service
 */
export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
    organizationId: string;
    name?: string;
    avatar?: string | null;
}

/**
 * Decoded token with JWT standard fields
 */
export interface DecodedToken extends TokenPayload, JwtPayload { }

/**
 * Verify and decode an access token
 * @param token - JWT access token string
 * @returns Decoded token payload
 * @throws AuthenticationError if token is invalid or expired
 */
export function verifyAccessToken(token: string): DecodedToken {
    try {
        const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as DecodedToken;
        return decoded;
    } catch (error) {
        throw new AuthenticationError('Invalid or expired token');
    }
}

/**
 * Extract token from Socket.io handshake
 * Supports both query param and auth header
 * @param handshake - Socket.io handshake object
 * @returns Token string or null if not found
 */
export function extractTokenFromHandshake(handshake: {
    query: Record<string, string | string[] | undefined>;
    auth: Record<string, any>;
    headers: Record<string, string | string[] | undefined>;
}): string | null {
    // Check query param first (e.g., ?token=xxx)
    const queryToken = handshake.query.token;
    if (typeof queryToken === 'string') {
        return queryToken;
    }

    // Check auth object (Socket.io auth option)
    if (handshake.auth?.token && typeof handshake.auth.token === 'string') {
        return handshake.auth.token;
    }

    // Check Authorization header
    const authHeader = handshake.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}
