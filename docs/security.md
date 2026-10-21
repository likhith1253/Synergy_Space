# Security & Authentication Strategy

The SynergySpace implements a robust, detached security perimeter suitable for microservices. Given that multiple services act upon user data independently, verifying identity across the cluster relies heavily on cryptographically signed tokens.

## Authentication Strategy (JWT)
1. **Login Negotiation:** Users authenticate via the `auth-service` by trading a validated Email and hashed Password for a JSON Web Token (JWT).
2. **Token Verification:** The `auth-service` is the sole issuer of the JWT. The payload contains immutable identity claims:
   - `userId` (UUID)
   - `organizationId` (UUID)
   - `role` (Admin, Editor, Viewer)
3. **Decentralized Validation:** Because the JWT is signed with a symmetric `JWT_SECRET` known across the internal backend services (or verified via a public key in an asymmetric setting), downstream services like the `document-service` and `organization-service` can validate the token payload locally without making a network hop back to the `auth-service`.

## Password Management
Passwords are never transmitted raw outside of the initial encrypted TLS tunnel. The `auth-service` utilizes strong bcrypt/argon2 hashing before saving anything to the Database layer. 

## API Key Protection
The integration with Google Gemini requires the `GEMINI_API_KEY`. 
- This key is **never** bundled into the Next.js frontend or JavaScript bundle.
- The Python `ai-service` serves as a secure proxy and prompt assembler. 
- The client initiates an AI execution request securely to the API Gateway using their JWT.
- The API Gateway proxies the authenticated request to the Python Service, which then injects the `GEMINI_API_KEY` directly against Google's servers.

## Access Logs & Audit Trails
Within the database, an `AccessLog` table tracks significant destructive or sensitive actions (e.g., deleting an organization, creating new billing pipelines). This enforces non-repudiation.

## Environment Variable Secrets
All secrets (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `DATABASE_URL`) are strictly passed through server environment variables. They must never be hardcoded into the repository codebase.
