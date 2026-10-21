# Deployment Guide

The deployment strategy for the SynergySpace requires coordination across edge networks and backend Virtual Private Servers (VPS) or containerized architectures since it leverages WebSocket statefulness and machine learning python scripts alongside standard Node endpoints. 

## Cloud Infrastructure Setup

### Frontend: Vercel
The Next.js React frontend (`apps/web`) is deployed directly onto Vercel. 
- Vercel automatically deploys pushes to the `main` branch. 
- Required Environment Variables in Vercel settings:
  - `NEXT_PUBLIC_API_URL`: Points to the deployed API Gateway domain.

### Backend Services: Render or Docker

Given the persistent needs of WebSockets and the API Gateway routing mechanism, Render provides a seamless Web Service deployment pipeline.

1. **API Gateway (`services/api-gateway`)**
   - Configured as the public-facing entry node.
   - Deployed as a Node Web Service.
   - Requires environment variables mapping the internal Render URLs of all downstream services (Auth, Org, Collab, Docs, AI).
   
2. **PostgreSQL Database**
   - Provision a Managed PostgreSQL database on Render.
   - This single connection string (`DATABASE_URL`) is supplied to Auth, Org, and Document services.

3. **Core Node Services (`auth`, `organization`, `document`)**
   - Deployed as private background workers or private web services (only accessible by the API Gateway).
   - Require `DATABASE_URL` and `JWT_SECRET`.
   - Build Commands: `npm install && npx prisma generate`
   - Start Commands: `npm run start`

4. **Collaboration Service (`collab-service`)**
   - Deployed as a web service.
   - Note: room membership and presence are held in memory, so a restart drops open sockets (clients reconnect and re-join). Content is persisted by the `document-service`, not by this service.

5. **AI Service (`ai-service`)**
   - Deployed as a Python Web Service on Render or a comparable service (e.g., Railway, Heroku).
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
   - Requires `GEMINI_API_KEY`.

## Dealing with "Cold Starts"
Deploying on free tiers typically involves "cold starts." The API Gateway is designed with fallback and timeout proxy rules to handle instances where downstream services require 30-50 seconds to boot up. Production deployments should scale these services to standard continuous-run tiers to avoid latency artifacts when users are initiating a WebSocket handshake.

## Dockerized Replication
For enterprise replication, the entire microservice cluster can be containerized. The included `docker-compose.yml` serves as the foundational mesh to interconnect PostgreSQL, Node instances, and Python instances under a single unified overlay network.
