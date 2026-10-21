import request from 'supertest';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';

jest.mock('@collab/database', () => {
    const model = () => ({
        findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
    });
    const prisma: any = {
        organization: model(),
        organizationMember: model(),
        user: model(),
        $transaction: jest.fn(),
    };
    return {
        getPrismaClient: () => prisma,
        PrismaClient: function () { return prisma; },
        checkDatabaseHealth: async () => ({ ok: true }),
        __prisma: prisma,
    };
});

import { app } from '../src/app';

const prisma = (jest.requireMock('@collab/database') as any).__prisma;

const ORG = '11111111-1111-4111-8111-111111111111';
const token = (userId: string) =>
    jwt.sign({ userId, email: `${userId}@example.com`, role: 'member', organizationId: ORG }, process.env.JWT_SECRET as string, { algorithm: 'HS256', expiresIn: '5m' });
const as = (userId: string) => ({ Authorization: `Bearer ${token(userId)}` });

const membership = (role: string | null) =>
    prisma.organizationMember.findUnique.mockImplementation(async () => (role ? { role } : null));

beforeEach(() => {
    for (const m of Object.values(prisma) as any[]) for (const fn of Object.values(m) as any[]) fn?.mockReset?.();
});

describe('organization routes', () => {
    it('require authentication', async () => {
        await request(app).get(`/${ORG}`).expect(401);
        await request(app).post(`/${ORG}/members`).send({ email: 'a@b.c' }).expect(401);
    });

    it('do not reveal an organization (or its member emails) to non-members', async () => {
        membership(null);
        await request(app).get(`/${ORG}`).set(as('stranger')).expect(404);
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('show an organization to its members', async () => {
        membership('member');
        prisma.organization.findUnique.mockResolvedValue({ id: ORG, name: 'Org', members: [] });
        await request(app).get(`/${ORG}`).set(as('m')).expect(200);
    });

    it('only owners/admins can add members, and only with a safe role', async () => {
        membership(null);
        await request(app).post(`/${ORG}/members`).set(as('stranger')).send({ email: 'x@example.com' }).expect(404);

        membership('member');
        await request(app).post(`/${ORG}/members`).set(as('m')).send({ email: 'x@example.com' }).expect(403);

        membership('admin');
        await request(app).post(`/${ORG}/members`).set(as('a')).send({ email: 'x@example.com', role: 'owner' }).expect(400);
        expect(prisma.organizationMember.create).not.toHaveBeenCalled();
    });
});

describe('billing checkout', () => {
    const body = { organizationId: ORG, planId: 'pro-monthly' };

    it('requires authentication', async () => {
        await request(app).post('/billing/checkout').send(body).expect(401);
    });

    it('refuses callers who are not an owner/admin of the organization', async () => {
        membership(null);
        await request(app).post('/billing/checkout').set(as('stranger')).send(body).expect(403);
        membership('member');
        await request(app).post('/billing/checkout').set(as('m')).send(body).expect(403);
        expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('rejects arbitrary Stripe price ids; only server-side plan keys are accepted', async () => {
        membership('owner');
        await request(app).post('/billing/checkout').set(as('o')).send({ organizationId: ORG, planId: 'price_attacker_chosen' }).expect(400);
        await request(app).post('/billing/checkout').set(as('o')).send({ organizationId: ORG, planId: '__proto__' }).expect(400);
    });
});

describe('Stripe webhook', () => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const event = JSON.stringify({
        id: 'evt_test', object: 'event', type: 'checkout.session.completed',
        data: { object: { id: 'cs_test', object: 'checkout.session', metadata: { organizationId: ORG } } },
    });
    const sign = (payload: string, secret = process.env.STRIPE_WEBHOOK_SECRET as string) =>
        stripe.webhooks.generateTestHeaderString({ payload, secret });

    it('rejects requests with no signature', async () => {
        await request(app).post('/billing/webhook').set('Content-Type', 'application/json').send(event).expect(400);
        expect(prisma.organization.update).not.toHaveBeenCalled();
    });

    it('rejects a signature made with the wrong secret', async () => {
        await request(app).post('/billing/webhook').set('Content-Type', 'application/json')
            .set('Stripe-Signature', sign(event, 'whsec_attacker')).send(event).expect(400);
        expect(prisma.organization.update).not.toHaveBeenCalled();
    });

    it('rejects a valid signature replayed over a modified body', async () => {
        const header = sign(event);
        await request(app).post('/billing/webhook').set('Content-Type', 'application/json')
            .set('Stripe-Signature', header).send(event.replace(ORG, '22222222-2222-4222-8222-222222222222')).expect(400);
        expect(prisma.organization.update).not.toHaveBeenCalled();
    });

    it('accepts a correctly signed event (raw body is preserved for verification)', async () => {
        prisma.organization.update.mockResolvedValue({});
        await request(app).post('/billing/webhook').set('Content-Type', 'application/json')
            .set('Stripe-Signature', sign(event)).send(event).expect(200);
        expect(prisma.organization.update).toHaveBeenCalledWith({ where: { id: ORG }, data: { subscription_status: 'active' } });
    });
});
