/**
 * JWT Utility Functions for Document Service
 * Handles token verification for incoming requests
 * Note: Token generation happens in auth-service; this service only verifies
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { config } from '../config';
import { InvalidTokenError } from './errors';

// Token payload interface - must match auth-service's TokenPayload
export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
    organizationId: string;
    scopes?: string[];
}

// Decoded token with JWT standard fields
export interface DecodedToken extends TokenPayload, JwtPayload { }

/**
 * Verify and decode an access token
 * @throws InvalidTokenError if token is invalid or expired
 */
export function verifyAccessToken(token: string): DecodedToken {
    try {
        const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as DecodedToken;
        return decoded;
    } catch (error) {
        throw new InvalidTokenError();
    }
}

/**
 * Extract Bearer token from Authorization header
 * @returns token string or null if not present/invalid format
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}
