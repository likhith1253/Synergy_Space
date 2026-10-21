# Application Features breakdown

## Real-Time Collaboration
Multiple users can edit the same document, slide deck or canvas at once. Edits are relayed over Socket.io: a client sends its latest content to the collaboration service, which forwards it to the other members of that document's room. Updates are whole-content and last-writer-wins; there is no CRDT/OT merge, so two people typing at the same moment can overwrite each other. Presence (who is in the document / organization) is shown, but not live cursors. Joining a room and sending updates is authorized against project membership; viewers are read-only (see [security.md](security.md)).

## AI-Assisted Editing
Through direct integration with Google's Gemini models, the editor features contextual generative capabilities out of the box. Users can request summaries, extensions, or code autocompletions. The AI service inherits the editor's live state block, formatting prompts that allow the Generative Model to respond comprehensively with situational awareness.

## Authentication and Security
Secure handling of user identity across distributed services via hardened JSON Web Tokens. Access scopes ensure organization and project boundaries are strictly audited (Access Logs). Passwords undergo cryptographic hashing before traversing to the database.

## Workspace Management
Granular data encapsulation designed around the Tenant Architecture model (Organizations -> Projects -> Documents). Users can create localized teams or participate globally across an organization. Organizations control the structural hierarchy and billing lifecycle.

## Payment Tiers
Incorporates base foundations mapped to a Stripe integration endpoint (accessible via `organization-service/src/routes/billing.routes.ts`). Defines the logical schema isolating "Free" standard access against subscription-restricted models managed per Organization entity.

## Multi-User Syncing & Awareness
Supports dynamic user limits with low latency. Presence indicators (User tags, actively colored cursors, and un-focus states) replicate Google Docs functionality natively, building a trusting cooperative environment.
