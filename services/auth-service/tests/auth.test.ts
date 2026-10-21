import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

jest.mock('@collab/database', () => {
    const { prisma } = require('./helpers/prisma');
    return { getPrismaClient: () => prisma };
});

import authRoutes from '../src/routes/auth.routes';
import passwordResetRoutes from '../src/routes/password-reset.routes';
import { errorHandler } from '../src/middleware/error.middleware';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/utils/jwt';
import { seedDemoWorkspace } from '../src/utils/demo-seeder';
import { prisma, resetPrisma } from './helpers/prisma';

const app = express();
app.use(express.json());
app.use('/', authRoutes);
app.use('/', passwordResetRoutes);
app.use(errorHandler);

const payload = { userId: 'u1', email: 'a@example.com', role: 'owner', organizationId: 'o1' };

beforeEach(() => resetPrisma());

describe('JWT handling', () => {
    it('round-trips an access token and does not accept it as a refresh token', () => {
        const token = signAccessToken(payload);
        expect(verifyAccessToken(token)?.userId).toBe('u1');
        expect(verifyRefreshToken(token)).toBeNull();
    });

    it('does not accept a refresh token as an access token', () => {
        expect(verifyAccessToken(signRefreshToken(payload))).toBeNull();
    });

    it('pins HS256: rejects HS512 tokens even when signed with the right secret', () => {
        const hs512 = jwt.sign(payload, process.env.JWT_SECRET as string, { algorithm: 'HS512' });
        expect(verifyAccessToken(hs512)).toBeNull();
    });

    it('rejects expired tokens', () => {
        const expired = jwt.sign(payload, process.env.JWT_SECRET as string, { algorithm: 'HS256', expiresIn: -5 });
        expect(verifyAccessToken(expired)).toBeNull();
    });

    it('has no fallback secret: signing fails closed when JWT_SECRET is missing', () => {
        const saved = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        try {
            expect(() => signAccessToken(payload)).toThrow(/JWT_SECRET/);
            // a token signed with the old hard-coded fallback must not verify either
            const forged = jwt.sign(payload, 'access-secret-fallback', { algorithm: 'HS256' });
            expect(verifyAccessToken(forged)).toBeNull();
        } finally {
            process.env.JWT_SECRET = saved;
        }
    });

    it('refuses to use the same value for both secrets', () => {
        const saved = process.env.JWT_REFRESH_SECRET;
        process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
        try {
            expect(() => signRefreshToken(payload)).toThrow(/differ/);
        } finally {
            process.env.JWT_REFRESH_SECRET = saved;
        }
    });
});

describe('protected routes', () => {
    it('GET /me requires a valid token', async () => {
        await request(app).get('/me').expect(401);
        await request(app).get('/me').set('Authorization', 'Bearer garbage').expect(401);
    });

    it('GET /me returns the profile for a valid token and never the password hash', async () => {
        prisma.user.findUnique.mockResolvedValue({
            id: 'u1', email: 'a@example.com', full_name: 'A', role: 'owner', avatar_url: null,
            organization_id: 'o1', password_hash: 'secret-hash', organization: { id: 'o1', name: 'O', slug: 'o' },
        });
        const res = await request(app).get('/me').set('Authorization', `Bearer ${signAccessToken(payload)}`).expect(200);
        expect(res.body.email).toBe('a@example.com');
        expect(JSON.stringify(res.body)).not.toContain('secret-hash');
    });
});

describe('account enumeration', () => {
    it('login returns the same response for an unknown account and a wrong password', async () => {
        prisma.user.findFirst.mockResolvedValueOnce(null);
        const unknown = await request(app).post('/login').send({ email: 'nobody@example.com', password: 'whatever12' });

        prisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', email: 'a@example.com', password_hash: await bcrypt.hash('right-password', 4) });
        const wrong = await request(app).post('/login').send({ email: 'a@example.com', password: 'wrong-password' });

        expect(unknown.status).toBe(401);
        expect(wrong.status).toBe(401);
        expect(unknown.body).toEqual(wrong.body);
    });

    it('register answers identically for a new and an already-registered address and issues no token for the latter', async () => {
        prisma.user.findFirst.mockResolvedValueOnce(null);
        prisma.pendingUser.upsert.mockResolvedValue({});
        const fresh = await request(app).post('/register').send({ email: 'new@example.com', password: 'longenough1', full_name: 'N' });

        prisma.user.findFirst.mockResolvedValueOnce({ id: 'u1' });
        const existing = await request(app).post('/register').send({ email: 'a@example.com', password: 'longenough1', full_name: 'A' });

        expect(existing.status).toBe(fresh.status);
        expect(existing.body).toEqual(fresh.body);
        expect(prisma.pendingUser.upsert).toHaveBeenCalledTimes(1);
    });

    it('password reset request answers identically whether or not the account exists', async () => {
        prisma.user.findFirst.mockResolvedValueOnce(null);
        const missing = await request(app).post('/request-reset').send({ email: 'nobody@example.com' });

        prisma.user.findFirst.mockResolvedValueOnce({ id: 'u1', email: 'a@example.com' });
        prisma.passwordResetToken.deleteMany.mockResolvedValue({});
        prisma.passwordResetToken.create.mockResolvedValue({});
        const found = await request(app).post('/request-reset').send({ email: 'a@example.com' });

        expect(missing.status).toBe(200);
        expect(found.status).toBe(200);
        expect(missing.body).toEqual(found.body);
    });
});

describe('brute-force protection', () => {
    it('limits login attempts per account regardless of client IP', async () => {
        prisma.user.findFirst.mockResolvedValue(null);
        const email = 'victim@example.com';
        let last = 0;
        for (let i = 0; i < 25; i++) {
            const res = await request(app).post('/login').set('X-Forwarded-For', `10.0.0.${i}`).send({ email, password: 'guess-guess' });
            last = res.status;
        }
        expect(last).toBe(429);
    }, 30000);
});

describe('password reset tokens', () => {
    const future = () => new Date(Date.now() + 60_000);

    it('rejects a weak new password without touching the account', async () => {
        const res = await request(app).post('/reset').send({ token: 'tok', newPassword: 'short' });
        expect(res.status).toBe(400);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects unknown tokens', async () => {
        prisma.passwordResetToken.findUnique.mockResolvedValue(null);
        await request(app).post('/reset').send({ token: 'nope', newPassword: 'long-enough-1' }).expect(400);
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects and removes expired tokens', async () => {
        prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 't1', email: 'a@example.com', expires_at: new Date(Date.now() - 1000) });
        await request(app).post('/reset').send({ token: 'old', newPassword: 'long-enough-1' }).expect(400);
        expect(prisma.passwordResetToken.delete).toHaveBeenCalled();
        expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('is single use: a successful reset deletes every outstanding token for the account', async () => {
        prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 't1', email: 'a@example.com', expires_at: future() });
        prisma.user.findFirst.mockResolvedValue({ id: 'u1', email: 'a@example.com' });
        prisma.user.update.mockResolvedValue({});
        prisma.passwordResetToken.deleteMany.mockResolvedValue({});
        await request(app).post('/reset').send({ token: 'good', newPassword: 'long-enough-1' }).expect(200);
        expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { email: 'a@example.com' } });
        const stored = prisma.user.update.mock.calls[0][0].data.password_hash;
        expect(await bcrypt.compare('long-enough-1', stored)).toBe(true);
    });
});

describe('demo account', () => {
    it('demo-login is disabled unless ENABLE_DEMO_MODE=true', async () => {
        delete process.env.ENABLE_DEMO_MODE;
        await request(app).post('/demo-login').expect(403);
    });

    it('the seeded demo user has no known password', async () => {
        const anyModel = new Proxy({}, { get: () => jest.fn().mockResolvedValue({ id: 'x' }) });
        const seedPrisma: any = new Proxy({} as any, { get: (target, prop) => (prop in target ? target[prop] : anyModel) });
        const existing = { id: 'demo-user', password_hash: await bcrypt.hash('DemoSecurePassword123!', 4) };
        const update = jest.fn().mockResolvedValue(existing);
        seedPrisma.user = {
            findUnique: jest.fn().mockResolvedValue(existing),
            update,
            create: jest.fn().mockResolvedValue(existing),
        };
        await seedDemoWorkspace(seedPrisma);
        const rotated = update.mock.calls[0][0].data.password_hash;
        expect(await bcrypt.compare('DemoSecurePassword123!', rotated)).toBe(false);
    });
});
