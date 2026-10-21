import jwt from 'jsonwebtoken';

// Secrets are read lazily and there is deliberately no fallback value: a missing
// secret must fail closed instead of silently signing with a publicly known key.
const accessSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    return secret;
};
const refreshSecret = (): string => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
    if (secret === process.env.JWT_SECRET) throw new Error('JWT_REFRESH_SECRET must differ from JWT_SECRET');
    return secret;
};

const ALGORITHM = 'HS256' as const;

const EXPIRES_IN = '15m'; // Short-lived access token
const REFRESH_EXPIRES_IN = '7d'; // Long-lived refresh token

export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
    organizationId: string;
}

export const signAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, accessSecret(), { algorithm: ALGORITHM, expiresIn: EXPIRES_IN });
};

export const signRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, refreshSecret(), { algorithm: ALGORITHM, expiresIn: REFRESH_EXPIRES_IN });
};

export const verifyAccessToken = (token: string): TokenPayload | null => {
    try {
        return jwt.verify(token, accessSecret(), { algorithms: [ALGORITHM] }) as TokenPayload;
    } catch (error) {
        return null;
    }
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
    try {
        return jwt.verify(token, refreshSecret(), { algorithms: [ALGORITHM] }) as TokenPayload;
    } catch (error) {
        return null;
    }
};
