# Stripe Payment Flow & Billing

The SynergySpace platform establishes the necessary schemas to monetize the SaaS platform using a tenant-first model. Subscriptions are tied to the `Organization` entity rather than isolated `User` entities.

## Database Integration
The Prisma schema for `Organization` tracks critical billing metadata:
- `stripe_customer_id`: Connects the internal Organization UUID to the Stripe Customer ID.
- `subscription_status`: Enum state (e.g., "free", "active", "past_due").
- `subscription_plan`: Tracks the active tier limits.
- `current_period_end`: Useful for gating logic upon subscription expiry.

## Typical Webhook Flow
While the initial repository serves as the baseline, the planned Stripe integration functions as follows:

1. **Checkout Session Creation:**
   - The user (as an Organization Admin) selects a tier from the UI.
   - The Gateway routes the intent to the `organization-service` via `/billing`.
   - The service securely utilizes the `STRIPE_SECRET_KEY` to generate a Stripe Checkout Session URL.

2. **Payment Verification & Webhooks:**
   - Instead of trusting the client to confirm payment, Stripe acts as the source of truth.
   - Upon successful payment authorization, Stripe fires a POST webhook payload back to the `organization-service/billing/webhook`.
   - The webhook endpoint verifies the cryptographic signature of the event.

3. **Database Finalization:**
   - Once validated, the `organization-service` updates the `organization` table (modifying `subscription_status` to `"active"`).
   - Any access denied state previously cast on the user's projects is immediately resolved.

## Security Considerations
- The Node.js application utilizes the raw request body buffer when validating Stripe webhook signatures, ensuring payload integrity.
- Client applications exclusively use `Stripe.js` to handle PCI-DSS sensitive credit card ingestion; the SynergySpace backend never natively processes or logs raw credit card PANs.
