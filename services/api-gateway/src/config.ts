import dotenv from 'dotenv';

dotenv.config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const sanitizeUrl = (url: string) => {
    if (!url) return url;
    let sanitized = url.trim().replace(/\/+$/, '');
    if (sanitized.includes('onrender.com') && !sanitized.startsWith('http')) {
        sanitized = `https://${sanitized}`;
    }
    return sanitized;
};

const getRequiredUrl = (key: string, fallback: string) => {
    const value = sanitizeUrl(process.env[key] || fallback);

    if (isProduction && !process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }

    return value;
};

export const config = {
    port: process.env.PORT || 8000,
    services: {
        auth: {
            url: getRequiredUrl('AUTH_SERVICE_URL', 'http://localhost:3001'),
        },
        org: {
            url: getRequiredUrl('ORG_SERVICE_URL', 'http://localhost:3004'),
        },
        docs: {
            url: getRequiredUrl('DOCS_SERVICE_URL', 'http://localhost:3002'),
        },
        collab: {
            url: getRequiredUrl('COLLAB_SERVICE_URL', 'http://localhost:3003'),
        },
        ai: {
            url: getRequiredUrl('AI_SERVICE_URL', 'http://localhost:8001'),
        },
    },
    // Number of trusted reverse-proxy hops in front of the gateway (1 = Render's load balancer)
    trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS || '1', 10),
    cors: {
        // Comma-separated allowlist. When CORS_ORIGIN is unset every origin is reflected (development only).
        allowedOrigins: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
            : ('*' as const),
    },
};