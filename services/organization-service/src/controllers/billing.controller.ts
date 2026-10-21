import { Request, Response } from 'express';
import Stripe from 'stripe';
import { getPrismaClient } from '@collab/database';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth.middleware';
// @ts-ignore
import { createLogger } from '@packages/logger';

const logger = createLogger('billing-controller');
const prisma = getPrismaClient();

if (!config.stripeSecretKey) {
    logger.error('STRIPE_SECRET_KEY is not defined');
}

const stripe = new Stripe(config.stripeSecretKey || '', {
    apiVersion: '2023-10-16' as any,
});

const PLANS = {
    'pro-monthly': {
        name: 'Pro',
        priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_1QjXXXXXX'
    },
    'team-monthly': {
        name: 'Team',
        priceId: process.env.STRIPE_TEAM_PRICE_ID || 'price_1QjYYYYYY'
    }
};

/** Only same-origin redirect targets (the configured frontend) are accepted. */
const safeRedirect = (candidate: unknown, fallback: string): string => {
    if (typeof candidate !== 'string' || !config.clientUrl) return fallback;
    try {
        const target = new URL(candidate);
        const allowed = new URL(config.clientUrl);
        return target.origin === allowed.origin ? target.toString() : fallback;
    } catch {
        return fallback;
    }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
    try {
        const { organizationId, planId, successUrl, cancelUrl } = req.body;
        const userId = (req as AuthRequest).user!.userId;

        if (typeof organizationId !== 'string' || typeof planId !== 'string') {
            return res.status(400).json({ error: 'Missing organizationId or planId' });
        }

        // The client sends a plan key; the Stripe price id is resolved server-side
        const plan = Object.prototype.hasOwnProperty.call(PLANS, planId) ? PLANS[planId as keyof typeof PLANS] : undefined;
        if (!plan) {
            return res.status(400).json({ error: 'Unknown plan' });
        }

        // Only an owner/admin of the organization may start a subscription for it
        const membership = await prisma.organizationMember.findUnique({
            where: { organization_id_user_id: { organization_id: organizationId, user_id: userId } }
        });
        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return res.status(403).json({ error: 'Only an organization owner or admin can manage billing' });
        }

        const organization = await prisma.organization.findUnique({
            where: { id: organizationId }
        });

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        let customerId = organization.stripe_customer_id;

        // Create Stripe customer if not exists
        if (!customerId) {
            const customer = await stripe.customers.create({
                name: organization.name,
                metadata: {
                    organizationId: organization.id
                }
            });
            customerId = customer.id;

            await prisma.organization.update({
                where: { id: organizationId },
                data: { stripe_customer_id: customerId }
            });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: plan.priceId,
                    quantity: 1,
                },
            ],
            metadata: {
                organizationId: organization.id
            },
            success_url: safeRedirect(successUrl, `${config.clientUrl}/billing/success`),
            cancel_url: safeRedirect(cancelUrl, `${config.clientUrl}/billing/cancel`),
        });

        res.json({ sessionId: session.id, url: session.url });

    } catch (error: any) {
        logger.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = config.stripeWebhookSecret;

    let event: Stripe.Event;

    try {
        if (!sig || !webhookSecret) {
            logger.error('Missing Stripe signature or webhook secret');
            throw new Error('Missing Stripe signature or secret');
        }
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
        logger.error(`Webhook Error: ${err.message}`);
        return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const organizationId = session.metadata?.organizationId;

                if (organizationId) {
                    await prisma.organization.update({
                        where: { id: organizationId },
                        data: {
                            subscription_status: 'active' as string,
                        }
                    });
                    logger.info(`Subscription activated for org ${organizationId}`);
                }
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                const org = await prisma.organization.findFirst({
                    where: { stripe_customer_id: customerId }
                });

                if (org) {
                    await prisma.organization.update({
                        where: { id: org.id },
                        data: {
                            subscription_status: subscription.status as string,
                            current_period_end: new Date((subscription as any).current_period_end * 1000)
                        }
                    });
                    logger.info(`Subscription updated for org ${org.id} to ${subscription.status}`);
                }
                break;
            }
        }
        res.json({ received: true });
    } catch (error) {
        logger.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};
