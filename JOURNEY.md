# The Journey

## Why this exists

I wanted hands-on experience with microservices. Not a tutorial with two toy services and a diagram — a real product, split along real boundaries, deployed to real infrastructure, with all the friction that comes with it.

Reading about microservices only gets you so far. The ideas sound clean on paper: independent services, clear ownership, scale each part on its own. What you don't learn from reading is what it actually *feels* like when one request crosses four processes, when a token has to be trusted by services written in two languages, when one service is asleep on free hosting and the rest are waiting for it, or when a WebSocket has to be routed through a proxy that was built for HTTP.

So I set myself a goal: **build something people would genuinely use, and build it the hard way — as a set of services — so that every concept had to be made to work, not just understood.**

## Why a collaboration tool

I needed a product that *deserved* to be split up. A to-do app does not. A real-time collaborative workspace does, because its parts are genuinely different from each other:

- **Identity** must be small, careful and boring.
- **Content** — projects, documents, slides, canvases — is the core, and grows with every feature.
- **Real-time** is a completely different kind of server: thousands of long-lived connections instead of short requests.
- **AI** depends on a slow, external, sometimes-unavailable provider, and is best written in Python.
- **Billing** has to be correct, and belongs to a team, not a person.

Each of those became its own service. The product gave the architecture a reason to exist, and the architecture gave me a reason to build the product properly.

## How we built it

**1. The foundation first.** The repository started as a monorepo with a shared Prisma schema and migrations, a shared logger and shared types. Before any feature, the data model for users, organizations, projects, documents and memberships had to be right, because every service would lean on it.

**2. Carving out the services.** Auth came first — sign-up, login, password hashing, short-lived access tokens and rotating refresh tokens. Then the Document service for projects, documents and version snapshots. Then the Organization service for tenancy and roles. Each one got its own port, its own config, its own Dockerfile and its own health endpoints.

**3. One front door.** Once there were several services, the frontend could not keep track of them all. The API Gateway became the single entry point: it routes by path, stamps a request ID on everything, handles CORS in one place, and upgrades WebSocket connections for the real-time service. After this, services could move around without the frontend ever knowing.

**4. Making it real-time.** The Collab service was built on Socket.IO: rooms per document, presence, live edits and team chat. A deliberate choice was to make it a *stateless relay* — it never owns document content; saving always goes through the Document service. That way, if it restarts, nothing is lost.

**5. Adding intelligence.** The AI service is the one that taught the most about why microservices exist. It is written in Python with FastAPI, because that is where the AI ecosystem lives, and it calls Google Gemini to generate, summarize and autocomplete. Because it runs in its own process, a slow or failing model never blocks someone saving their work.

**6. Getting paid.** Stripe Checkout was wired into the Organization service, with the subscription activated only by a signed webhook — never trusting the browser's redirect.

**7. Shipping it.** Deploying six services onto free-tier hosting — the web app on Vercel, the services and database on Render — was its own education: build order for shared packages, environment variables per service, cold starts, and keeping services awake.

**8. Locking it down.** With everything working, the next pass was security: every service verifies the JWT itself instead of trusting the gateway, project roles (owner, admin, editor, viewer) are enforced on every route and every socket room, the AI service checks the same token and rate-limits each user, and the critical paths are covered by Jest and pytest suites running in CI on every push.

**9. Making it look the part.** Finally, the interface was rebuilt from scratch: a calm, professional "paper and ink" design system, editorial typography, and a landing page that shows the product and its architecture in motion — including an interactive diagram of the services this whole project was about.

## What it taught me

- **Boundaries are the real design work.** Writing a service is easy; deciding what it owns, and what it must never touch, is the hard part.
- **Never trust the network.** Authentication belongs in every service, not just at the edge.
- **Pick the right language per service.** Node for I/O and sockets, Python for AI — microservices make that a per-service choice instead of a per-project one.
- **Isolate the things that fail.** External APIs will go down; the product should not go down with them.
- **Be honest about trade-offs.** A shared database, last-writer-wins editing and in-memory rate limits are conscious compromises, documented in [DESIGN.md](DESIGN.md) with a path forward for each.

The result is SynergySpace: a working, deployed, real-time collaboration platform — and, more than that, the project where microservices stopped being a diagram and became something I have actually built and run.
