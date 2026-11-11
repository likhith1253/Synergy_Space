# SynergySpace — Demo Walkthrough Script

## Video Goal
Show a recruiter / evaluator the full SynergySpace product in ~90 seconds:
real-time collaboration, role-based access, AI assistance, and Stripe billing —
all running locally.

---

## Scene-by-Scene Plan

### 0 · Title Card (3 s)
- Overlay text: **"SynergySpace — Real-Time Collaborative Workspace"**
- Sub-text: *"6 microservices · Next.js · Socket.IO · Gemini AI · Stripe"*

---

### 1 · Landing Page (5 s)
- Navigate to `http://localhost:3005`
- Pause on the hero section so the viewer sees the product name and CTA.

---

### 2 · Sign-up / One-Click Demo (8 s)
- Click **"Try the live demo"** button (demo mode — no sign-up needed).
- Wait for the dashboard to load.
- Highlight: *"Pre-filled workspace with demo data seeded automatically."*

---

### 3 · Dashboard — Workspace Overview (8 s)
- Show the workspace list / project cards.
- Hover over a project to show live-presence avatars.
- Scroll down briefly to show the sidebar and nav.

---

### 4 · Document Editor — Real-Time Editing (15 s)
- Open a document.
- Type a few words — observe TipTap editor with rich-text toolbar.
- Show the **live cursor indicator** (second session simulated by the recorder).
- Show the **presence bar** (online members) at the top.

---

### 5 · AI Assistant Sidebar (12 s)
- Click the AI ✨ button in the editor toolbar.
- Type: *"Summarize this document in one sentence."*
- Watch the streaming response from Gemini appear.
- Highlight: *"Dedicated FastAPI + Gemini microservice — zero impact on editing."*

---

### 6 · Slide Deck Editor (8 s)
- Navigate to **Slides** view.
- Show the slide panel on the left and the editable canvas on the right.
- Add a text element or move a slide.

---

### 7 · Shared Canvas (8 s)
- Navigate to the **Canvas** view.
- Draw a shape or add a sticky note.
- Real-time sync bar / presence visible.

---

### 8 · Team & Role Management (8 s)
- Go to **Settings → Members**.
- Show the invite-by-email UI and role dropdown (Owner / Admin / Editor / Viewer).
- Highlight: *"Role checks enforced on every API route and every socket room."*

---

### 9 · Billing (Stripe) (6 s)
- Navigate to **Settings → Billing**.
- Show the Stripe Checkout button.
- Highlight: *"Activated only by a signed webhook — not by checkout session creation."*

---

### 10 · API Gateway Health Check (5 s)
- Open DevTools Network tab (or a terminal).
- Show `GET /health` returning status of all 6 services.

---

### 11 · Architecture Recap (5 s)
- Fade to the Mermaid architecture diagram from README.
- Callouts: gateway → auth → document → collab → AI → org.

---

### 12 · Outro (3 s)
- Text overlay: **"github.com/likhith1253/Synergy_Space"**
- Sub-text: *"6 microservices · Full source code · MIT license"*

---

## Timing Summary

| Scene | Duration |
|---|---|
| Title card | 3 s |
| Landing page | 5 s |
| Demo login | 8 s |
| Dashboard | 8 s |
| Document editor + cursors | 15 s |
| AI assistant | 12 s |
| Slide editor | 8 s |
| Canvas | 8 s |
| Team / roles | 8 s |
| Billing | 6 s |
| Health check | 5 s |
| Architecture | 5 s |
| Outro | 3 s |
| **Total** | **~94 s** |

---

## Notes for Recorder
- Resolution: 1280 × 720 (or native screen if higher).
- Frame rate: 30 fps.
- Output: `docs/demo/synergyspace_demo.mp4`.
- The recorder (`record_demo.py`) handles all navigation automatically via Playwright.
- Run: `python scripts/record_demo.py`
