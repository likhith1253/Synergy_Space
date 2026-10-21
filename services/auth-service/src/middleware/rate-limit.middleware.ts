import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
// @ts-ignore - Local module resolution
import { createLogger } from '@packages/logger';

const logger = createLogger('auth-service');

const envInt = (key: string, fallback: number): number => {
    const parsed = parseInt(process.env[key] || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function resolveClientIp(req: Request): string {
    const originalClientIp = req.headers['x-original-client-ip'];
    if (originalClientIp) {
        return Array.isArray(originalClientIp) ? originalClientIp[0].trim() : originalClientIp.trim();
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        const ips = Array.isArray(forwardedFor) ? forwardedFor[0].split(',') : forwardedFor.split(',');
        return ips[0].trim();
    }
    
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    
    return req.ip || 'unknown';
}

export const registerRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: envInt('REGISTER_RATE_LIMIT_MAX', 30),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `register:${resolveClientIp(req)}`,
    handler: (req: Request, res: Response, next: NextFunction, options: any) => {
        const ip = resolveClientIp(req);
        const email = req.body?.email || 'no-email';
        logger.warn(`[RateLimit] Registration limit exceeded for IP: ${ip}, Email: ${email}`);
        
        res.status(429).json({
            success: false,
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Too many registration attempts. Please wait 15 minutes and try again.',
                details: { limit: options.max, windowMs: options.windowMs }
            }
        });
    },
    skip: () => false
});

export const demoRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: envInt('DEMO_RATE_LIMIT_MAX', 300),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: () => 'demo-login-global',
    skip: () => process.env.NODE_ENV === 'development',
    handler: (req: Request, res: Response, next: NextFunction, options: any) => {
        logger.warn('[RateLimit] Demo login global limit exceeded');
        res.status(429).json({
            success: false,
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Demo service is temporarily overloaded. Please try again in a moment.',
            }
        });
    }
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: envInt('AUTH_RATE_LIMIT_MAX', 300),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
        const ip = resolveClientIp(req);
        const key = `auth:${ip}`;
        return key;
    },
    handler: (req: Request, res: Response, next: NextFunction, options: any) => {
        const ip = resolveClientIp(req);
        logger.warn(`[RateLimit] General auth limit exceeded for IP: ${ip}`);
        
        res.status(429).json({
            success: false,
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Too many requests. Please slow down and try again.',
                details: { limit: options.max, windowMs: options.windowMs }
            }
        });
    }
});

/**
 * Credential-stuffing / brute-force guard: keyed on the target account (not the
 * client IP, which an attacker can vary), applied to login and password-reset.
 */
export const accountRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: envInt('ACCOUNT_RATE_LIMIT_MAX', 20),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `account:${String(req.body?.email || req.body?.token || 'none').toLowerCase().slice(0, 256)}`,
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Too many attempts for this account. Please wait 15 minutes and try again.',
            }
        });
    }
});
