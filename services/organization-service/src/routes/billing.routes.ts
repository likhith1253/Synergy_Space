import { Router } from 'express';
import * as BillingController from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Checkout requires an authenticated organization owner/admin (checked in the controller).
router.post('/checkout', authenticate, BillingController.createCheckoutSession);

// NOTE: POST /billing/webhook is mounted in index.ts *before* express.json() so Stripe's
// signature can be verified against the untouched raw request body.

export default router;
