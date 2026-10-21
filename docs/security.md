# Security model

This document describes what the code actually enforces, and what it does not. It reflects the state after the October 2026 security review (see "Known limitations" at the end).

## Trust boundaries

```text
Internet -> Vercel (Next.js) -> API gateway -> auth / document / organization / collab / AI services -> PostgreSQL
```

- The **API gateway** is the intended public entry point. The individual services also listen on public URLs on Render's free tier, so every service verifies the caller itself; none of them relies on the gateway for authentication.
- There is **no service-to-service trust**: no service accepts a user id, role or organization from a header. Identity always comes from a verified JWT.

## Authentication

| Item | Behaviour |
|---|---|
| Token issuer | `auth-service` only (`/login`, `/verify-email`, `/refresh`, `/demo-login`) |
| Algorithm | HS256, **pinned** on every verifier (auth, document, organization, collab, ai-service). Tokens with `alg: none` or HS512 are rejected (covered by tests). |
| Access token | 15 min, signed with `JWT_SECRET` |
| Refresh token | 7 days, signed with a **different** secret (`JWT_REFRESH_SECRET`); a refresh token is not accepted as an access token and vice versa. Auth-service refuses to sign if both secrets are equal. |
| Secrets | No fallback values. If `JWT_SECRET` is missing, auth-service cannot sign, verifiers reject every token, and the AI service returns 503. Previously auth-service silently fell back to a hard-coded string. |
| Shared secret | The same `JWT_SECRET` must be configured in auth, document, organization, collab and AI services (`render.yaml` wires this). Rotating it logs everyone out. |
| Client storage | The web app keeps tokens in `sessionStorage` (readable by any XSS). No httpOnly cookies are used, so there is no CSRF surface, but token theft via XSS is the main residual risk. |

Claims in the token (`role`, `organizationId`) are **not** used for authorization of project resources; those are resolved from the database on each request.

## Authorization model

Effective role on a **project**:

| Role | Source | read | write (edit docs/slides/canvas, snapshot, create) | delete document | manage (delete project, add members, invite) |
|---|---|:-:|:-:|:-:|:-:|
| owner | `projects.owner_id` | yes | yes | yes | yes |
| admin | `team_members.role` | yes | yes | yes | no |
| editor | `team_members.role` | yes | yes | no | no |
| viewer | `team_members.role` | yes | no | no | no |
| none | - | no | no | no | no |

Implementation: `packages/database/src/access.ts` (`getProjectRole`, `roleAllows`) used by `document-service/src/services/access.service.ts` and `collab-service/src/services/access.service.ts`. Unknown roles satisfy nothing (fail closed). Resource ids that are not UUIDs are treated as not found.

- Documents, versions, canvas, presentations, slides, team roster and chat history are all reached through the project role above.
- A caller with no role on the project gets **404** (not 403) so ids cannot be probed.
- Creating a project requires membership of the target organization (the request body can no longer name an arbitrary `organization_id`).
- Project invitations and team membership accept only `admin | editor | viewer`.
- **Organizations** (organization-service): `GET /orgs/:id` is visible to members only; adding members requires org `owner`/`admin` and only allows `admin`/`member`.
- **Billing**: `POST /billing/checkout` requires an authenticated org `owner`/`admin`. The client sends a plan key (`pro-monthly`, `team-monthly`); the Stripe price id is resolved server-side, and redirect URLs must be on `CLIENT_URL`'s origin.
- **Stripe webhook** (`POST /billing/webhook`): verified with `stripe.webhooks.constructEvent` against the raw body (the route is mounted before `express.json()`), covered by tests with valid, wrong-secret and tampered payloads.

## Realtime (Socket.io)

- The handshake requires a valid JWT (`auth.token`, `?token=` or `Authorization: Bearer`). Unauthenticated sockets never connect.
- `join-document`, `join-slide`, `join-chat` and `join-organization` are authorized against the database before the socket joins the room.
- Content events (`document-update`, `canvas-update`, `slide-update`) are only relayed if the socket previously joined that exact room **and** holds write access. Viewers are read-only. `chat:send` requires an authorized chat join, and the sender identity is taken from the token, never from the payload.
- Room membership is evaluated at join time. Removing someone from a project does not evict an already-open socket until it reconnects.
- The collab service relays whole-content updates; it does not run a CRDT. Yjs is not used on the server or by the editors.

## Auth service hardening

- Login: unknown account and wrong password return the same response, and the unknown-account path still performs a bcrypt comparison to even out timing.
- Registration returns the same response whether or not the address is already registered (no account enumeration). Password reset already behaved this way.
- Password reset: tokens are random 256-bit values, expire after 1 hour, are single use (all outstanding tokens for the account are deleted on success), and the new password must be 8-128 characters.
- Rate limits (env-tunable): per-IP `AUTH_RATE_LIMIT_MAX` (default 300 / 15 min), `REGISTER_RATE_LIMIT_MAX` (30), and a per-**account** limit `ACCOUNT_RATE_LIMIT_MAX` (20 / 15 min) on login and password reset, which holds even if the attacker varies source IPs.
- The gateway no longer trusts client-supplied `CF-Connecting-IP`, `X-Real-IP`, `X-Original-Client-IP` or the client's own `X-Forwarded-For`; it derives the client address from `req.ip` with a fixed number of trusted proxy hops (`TRUST_PROXY_HOPS`, default 1) and overwrites those headers before proxying.
- Demo account: the demo workspace is only seeded, and `/demo-login` only works, when `ENABLE_DEMO_MODE=true`. The demo user's password is random and unknown, so `/login` cannot be used with it. (Previously a fixed, source-visible password was seeded on every boot.)

## AI service

`POST /ai/chat` spends paid Gemini quota. It now requires a valid access token (HS256, `JWT_SECRET`), is limited per user (`RATE_LIMIT_PER_MINUTE`, default 20, in-memory per process), caps prompt (4,000 chars) and document context (50,000 chars), no longer relaxes Gemini safety filters, and no longer echoes provider error text to the client. The Gemini key is only ever read by the AI service.

## Error handling

Services return generic messages for unexpected errors (no stack traces, SQL or provider text). Operational errors (validation, not found, forbidden) return their message.

## CORS

- Gateway and collab service: allowlist from `CORS_ORIGIN` (comma separated). **If `CORS_ORIGIN` is unset they reflect any origin** (development convenience), so set it in production.
- Downstream services (`auth`, `document`, `organization`) still reflect any origin because they are only meant to be reached via the gateway. Since authentication is a bearer header rather than a cookie, a reflected origin does not by itself expose a session.

## Secrets and configuration

- `.env`, `.env.local` and `*.env` are git-ignored. Only `.env.example` files with empty or placeholder values are tracked.
- `NEXT_PUBLIC_*` variables are service URLs only; no secret is exposed to the browser bundle.
- Earlier commits in the Git history contained committed `.env` files. Anything that was in them must be treated as compromised and rotated; removing a file from the tip does not remove it from history.

## Known limitations

- **No transactional email.** Verification and password-reset links are written to the auth-service log ("mock email"). Anyone with log access can read them. A real mail provider is required before this can be considered production-grade, and then the logging should be removed.
- **Rate limiting is in-memory** (per process, resets on restart) and downstream services trust `X-Original-Client-IP` from whoever connects to them; they must not be exposed directly to untrusted clients for IP-based limits to hold. The per-account login limit does not depend on it.
- **No refresh-token rotation or revocation list.** A stolen refresh token is valid for 7 days.
- **Stale claims:** `role`/`organizationId` inside a still-valid token can lag behind the database for up to 15 minutes (not used for project authorization).
- **`requireScope`** in the document service is a no-op: tokens carry no scopes, and authorization is the project-role check above.
- **Document content** is stored as text in a column named `yjs_binary_state`; versions copy it. There is no size limit beyond Express' default JSON body limit (100 kB).
- **Socket events are not rate limited.** An authorized member can flood a room they belong to.
- Project membership is project-level only; being in an organization does not grant access to its projects.
