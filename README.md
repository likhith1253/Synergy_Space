# SynergySpace

A real-time collaborative workspace: multi-user document editing, presentations, canvas and team chat, with AI writing assistance, organizations and role-based access. Built as a microservice monorepo.

**Live demo:** https://synergyspace-web.vercel.app (free-tier hosting, so the first load after idle can take ~30-60 s while the services wake up)

[Features](docs/features.md) · [Architecture](docs/architecture.md) · [Setup](docs/setup.md) · [API reference](docs/api_reference.md) · [Security notes](docs/security.md)

---

## What it does

- **Live co-editing** over WebSockets (Socket.IO) with [Yjs](https://github.com/yjs/yjs) CRDTs, so concurrent edits from several users merge without conflicts.
- **AI assistance** (text generation, summarization, autocomplete) served by a separate Python/FastAPI service that calls Google Gemini.
- **Workspaces:** organizations, projects, teams, email invitations, and per-user roles.
- **Content types:** documents with saved version snapshots, slide presentations, a canvas, and in-app messages.
- **Auth:** email/password sign-up with verification, JWT sessions, password reset.
- **Billing:** Stripe Checkout from the pricing page, with the subscription tied to the organization.

## Architecture

All client traffic goes through one API gateway that routes to the individual services.

```mermaid
graph TD
    User([User]) <-->|HTTPS / WebSocket| Web[Next.js web app]
    Web <-->|HTTPS / WebSocket| Gateway[API Gateway]

    Gateway -->|/auth| Auth[Auth service]
    Gateway -->|/orgs, /billing| Org[Organization service]
    Gateway -->|/documents, /projects| Doc[Document service]
    Gateway <-->|/socket.io| Collab[Collaboration service]
    Gateway -->|/ai| AI[AI service - FastAPI]

    Collab <-->|persists state| Doc
    AI --> Gemini([Google Gemini API])
    Org --> Stripe([Stripe API])

    Auth -.-> DB[(PostgreSQL)]
    Org -.-> DB
    Doc -.-> DB
```

Design notes and honest trade-offs:

- Services share a single PostgreSQL database through a shared Prisma package (`packages/database`). That keeps the project simple to run, but it means the services are not independently deployable data-wise.
- The gateway is a single instance and the database is a single instance, so this is a clean service separation, not a high-availability setup.
- Real-time sync is client-server (clients talk to the collaboration service), not peer-to-peer. No latency benchmark has been published yet.

## Screenshots

| Dashboard | Editor | Pricing / checkout |
|:---:|:---:|:---:|
| ![Dashboard](docs/images/screenshot_home.png) | ![Editor](docs/images/editor_view.png) | ![Payment](docs/images/payment_page.png) |

## Tech stack

| Area | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend services | Node.js, Express, TypeScript, Socket.IO, Yjs |
| AI service | Python, FastAPI, Google Generative AI SDK |
| Data | PostgreSQL, Prisma |
| Payments | Stripe |
| Hosting | Vercel (web), Render (services + database) |

## Run it locally

**Prerequisites:** Node.js 18+, Python 3.9+, PostgreSQL (or Docker), a Gemini API key.

```bash
git clone https://github.com/likhith1253/Synergy_Space.git
cd Synergy_Space
npm install
```

1. **Database.** Start Postgres (`docker compose up -d postgres` uses the included `docker-compose.yml`).
2. **Environment.** In `packages/database`, each service in `services/*`, and `apps/web`, copy `.env.example` to `.env` (for `apps/web`, `.env.local`) and fill it in. Default ports: gateway 8000, auth 3001, document 3002, collab 3003, organization 3004, AI 8001. `apps/web` requires all five `NEXT_PUBLIC_*` URLs listed in its `.env.example` for a production build. The important keys are `DATABASE_URL`, `JWT_SECRET` (the same value in every service that verifies tokens), and `GEMINI_API_KEY` for the AI service. `.env` files are git-ignored.
3. **Schema.**
   ```bash
   npm run db:push --workspace @collab/database
   ```
4. **Node services and web app.**
   ```bash
   npm run dev
   ```
5. **AI service** (separate terminal):
   ```bash
   cd services/ai-service
   pip install -r requirements.txt
   python -m src.main
   ```

Then open http://localhost:3000. Set `MOCK_AI=true` in `services/ai-service/.env` to try the editor without a Gemini key.

## Repository layout

```text
apps/web/                 Next.js frontend
services/
  api-gateway/            routing / proxy
  auth-service/           sign-up, login, JWT, password reset
  collab-service/         Socket.IO + Yjs real-time sync
  document-service/       documents, projects, slides, canvas, messages, invites
  organization-service/   organizations and Stripe billing
  ai-service/             FastAPI + Gemini
packages/
  database/               Prisma schema and migrations
  logger/  types/         shared libraries
docs/                     architecture, API, security, payment flow, setup
```

## Status and roadmap

Known gaps, stated plainly:

- **No automated tests yet.** CI currently verifies that every package installs and builds and that the AI service compiles. Next up: auth-service tests, role/permission checks in the document service, and a two-client Yjs sync test.
- **Offline editing** (persisting Yjs state in IndexedDB and merging on reconnect) is not implemented.
- **Rich-text AI output** (headings, lists, inline styles) is not implemented; the AI service returns plain text.
- **Observability:** no metrics or tracing beyond structured logs.

## License

[MIT](LICENSE)
