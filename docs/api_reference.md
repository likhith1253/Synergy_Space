# API Reference

The SynergySpace API is RESTful and utilizes the API Gateway as the primary routing mechanism. All requests to the frontend domain at `/api/*` are proxied to their respective backend macro-services.

## Base URL
`https://api.yourdomain.com/` (Production)
`http://localhost:8000/` (Development)

## Authentication Requirements
The majority of endpoints require a valid JWT passed in the Authorization header.
**Header:**
`Authorization: Bearer <your_jwt_token>`

---

## 🔐 Auth Service (`/auth`)
Manages user sessions, registration, and credential verification.

### `POST /auth/register`
Creates a new user account.
- **Required Parameters**
  - `email` (string): Valid email address.
  - `password` (string): Minimum 8 characters.
  - `full_name` (string): First and Last name.
- **Sample Request**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "full_name": "Jane Doe"
  }
  ```
- **Sample Response** (201 Created)
  ```json
  {
    "success": true,
    "user": { "id": "uuid", "email": "user@example.com" },
    "token": "eyJhbGci..."
  }
  ```

### `POST /auth/login`
Authenticates an existing user and returns a session token.
- **Required Parameters**
  - `email` (string)
  - `password` (string)

---

## 🏢 Organization Service (`/orgs`)
Handles tenant namespaces and member affiliations.

### `POST /orgs`
Creates a new organization context for the authenticated user.
- **Required Parameters**
  - `name` (string): Display name of the organization.
  - `slug` (string): URL-friendly unique identifier.

### `GET /orgs`
Retrieves all organizations associated with the authenticated user.
- **Required Parameters**
  - *None*

---

## 📄 Document Service (`/projects`, `/documents`, `/canvas`, `/slides`)
Operates the primary collaborative resources and folder structures.

### `POST /projects`
Creates a new logical workspace/project within an Organization.
- **Required Parameters**
  - `name` (string)
  - `organization_id` (uuid)

### `GET /documents/:id`
Fetches a document (title, saved `content` text, project id, timestamps) by UUID. Requires read access to the document's project; otherwise `404`.
- **Required Parameters**
  - `id` (uuid path parameter)
- **Sample Response** (200 OK)
  ```json
  {
    "id": "uuid",
    "title": "Q3 Marketing Plan",
    "project_id": "uuid",
    "owner_id": "uuid",
    "created_at": "2026-02-21T00:00:00.000Z"
  }
  ```

---

## 🤖 AI Service (`/ai`)
Handles context-aware generative processing.

### `POST /ai/chat`
Requests an AI completion based on a user prompt and surrounding document text.
- **Required Parameters**
  - `prompt` (string): The explicit user instruction (e.g., "Summarize this").
  - `context` (string): The surrounding text extracted by the frontend editor cursor position.
- **Sample Request**
  ```json
  {
    "prompt": "Make this paragraph sound more professional.",
    "context": "We did a lot of things this quarter and it was cool."
  }
  ```
- **Sample Response** (200 OK)
  ```json
  {
    "response": "Throughout this quarter, our team executed numerous strategic initiatives resulting in appreciable success."
  }
  ```

---

## 💳 Billing Service (`/billing`)
Tracks subscription transitions via Stripe webhooks.

### `POST /billing/webhook`
Internal-facing or Stripe-facing webhook endpoint to confirm payment intents.
- **Security:** Requires Stripe Signature header validation.
