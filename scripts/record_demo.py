"""SynergySpace — Automated Demo Walkthrough Recorder
======================================================
Produces docs/demo/synergyspace_demo.mp4 (and .webm).

Usage:
    python scripts/record_demo.py

Requirements:
    pip install playwright requests imageio-ffmpeg
    playwright install chromium

All six services and the Next.js web app must be reachable on localhost.
"""

import os, shutil, math, json, time, subprocess, requests
from pathlib import Path
from playwright.sync_api import sync_playwright, Page

# ── config ───────────────────────────────────────────────────────────────────
BASE     = "http://localhost:3000"
GATEWAY  = "http://localhost:8000"
W, H     = 1440, 900
OUT_DIR  = Path(__file__).parent.parent / "docs" / "demo"
OUT_DIR.mkdir(parents=True, exist_ok=True)
VID_DIR  = OUT_DIR / "_video_raw"
shutil.rmtree(VID_DIR, ignore_errors=True)
VID_DIR.mkdir(parents=True)


# ── overlay JS (cursor + caption pill, suppress demo modal) ──────────────────
OVERLAY = r"""
localStorage.setItem('hasSeenDemoModal','true');
localStorage.setItem('hasSeenTour','true');
localStorage.setItem('productTourCompleted','true');
localStorage.setItem('guidedOnboardingCompleted','true');
(() => {
  const install = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div');
    c.id = '__cur';
    c.innerHTML = '<svg width="22" height="24" viewBox="0 0 16 18"><path d="M1 1l13 7.5-6 1.5-3 6L1 1z" fill="#15171c" stroke="#fff" stroke-width="1.3"/></svg>';
    Object.assign(c.style, {
      position:'fixed', left:'-40px', top:'-40px', zIndex:'2147483647',
      pointerEvents:'none', transition:'left 80ms linear,top 80ms linear'
    });
    document.body.appendChild(c);
    const cap = document.createElement('div');
    cap.id = '__cap';
    Object.assign(cap.style, {
      position:'fixed', left:'28px', bottom:'28px', zIndex:'2147483646',
      pointerEvents:'none', background:'rgba(21,23,28,0.92)', color:'#ecebe6',
      font:'500 15px/1.3 Geist,Inter,system-ui,sans-serif',
      padding:'10px 20px', borderRadius:'999px', opacity:'0',
      transition:'opacity 400ms,transform 400ms', transform:'translateY(8px)',
      boxShadow:'0 12px 30px -10px rgba(0,0,0,.4)', letterSpacing:'-0.01em',
      maxWidth:'700px', whiteSpace:'nowrap'
    });
    document.body.appendChild(cap);
    const last = sessionStorage.getItem('__cap');
    if (last) { cap.textContent = last; cap.style.opacity='1'; cap.style.transform='none'; }
  };
  window.__caption = t => {
    install();
    const cap = document.getElementById('__cap');
    if (!cap) return;
    sessionStorage.setItem('__cap', t || '');
    if (!t) { cap.style.opacity='0'; return; }
    cap.style.opacity='0'; cap.style.transform='translateY(8px)';
    setTimeout(() => { cap.textContent=t; cap.style.opacity='1'; cap.style.transform='none'; }, 180);
  };
  document.addEventListener('mousemove', e => {
    install();
    const c = document.getElementById('__cur');
    if (c) { c.style.left=e.clientX+'px'; c.style.top=e.clientY+'px'; }
  }, true);
  document.addEventListener('mousedown', () => { const c=document.getElementById('__cur'); if(c) c.style.transform='scale(0.78)'; }, true);
  document.addEventListener('mouseup',   () => { const c=document.getElementById('__cur'); if(c) c.style.transform=''; }, true);
  if (document.readyState!=='loading') install();
  else document.addEventListener('DOMContentLoaded', install);
})();
"""

SETUP_ONLY = """
localStorage.setItem('hasSeenDemoModal','true');
localStorage.setItem('hasSeenTour','true');
localStorage.setItem('productTourCompleted','true');
localStorage.setItem('guidedOnboardingCompleted','true');
"""


# ── Director ─────────────────────────────────────────────────────────────────
class Director:
    def __init__(self, page: Page):
        self.p = page
        self.x = W / 2
        self.y = H / 2

    def pause(self, s: float):
        self.p.wait_for_timeout(int(s * 1000))

    def caption(self, text: str):
        try:
            self.p.evaluate("t => window.__caption && window.__caption(t)", text)
        except Exception:
            pass

    def move(self, x: float, y: float, steps: int = 30):
        self.p.mouse.move(x, y, steps=steps)
        self.x, self.y = x, y

    def to(self, loc, steps: int = 30, dx: float = 0.5, dy: float = 0.5, timeout: int = 30_000):
        loc.wait_for(state="visible", timeout=timeout)
        loc.scroll_into_view_if_needed()
        bb = loc.bounding_box()
        tx = bb["x"] + bb["width"]  * dx
        ty = bb["y"] + bb["height"] * dy
        self.move(tx, ty, steps)
        return loc

    def click(self, loc, after: float = 0.6, steps: int = 30, timeout: int = 30_000):
        self.to(loc, steps=steps, timeout=timeout)
        self.pause(0.22)
        self.p.mouse.down()
        self.p.mouse.up()
        self.pause(after)

    def try_click(self, loc, after: float = 0.5, timeout: int = 8_000) -> bool:
        try:
            self.click(loc, after=after, timeout=timeout)
            return True
        except Exception:
            return False

    def scroll_to(self, y: float, duration: float = 1.6):
        self.p.evaluate("y => window.scrollTo({top:y,behavior:'smooth'})", y)
        self.pause(duration)

    def scroll_el(self, selector: str, offset: int = -90, duration: float = 1.6):
        self.p.evaluate(
            "([s,o])=>{const el=document.querySelector(s);if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY+o,behavior:'smooth'});}",
            [selector, offset]
        )
        self.pause(duration)

    def goto(self, path: str, wait: str = "networkidle"):
        self.p.goto(BASE + path, wait_until=wait, timeout=120_000)
        self.p.mouse.move(self.x, self.y)


def lookup_demo_ids(token: str):
    """Fetch fresh project/doc/presentation IDs using the active browser token."""
    try:
        hdrs = {"Authorization": f"Bearer {token}"}
        projects = requests.get(f"{GATEWAY}/projects", headers=hdrs, timeout=10).json()
        apollo   = next((p for p in projects if "Apollo" in p["name"]), projects[0] if projects else None)
        creative = next((p for p in projects if "Creative" in p["name"] or "Asset" in p["name"]), projects[-1] if projects else None)

        apollo_id   = apollo["id"]   if apollo   else None
        creative_id = creative["id"] if creative else None

        first_doc_id = None
        if apollo_id:
            docs = requests.get(f"{GATEWAY}/projects/{apollo_id}/documents", headers=hdrs, timeout=10).json()
            if isinstance(docs, list) and docs:
                first_doc_id = docs[0]["id"]

        first_pres_id = None
        if creative_id:
            pres = requests.get(f"{GATEWAY}/projects/{creative_id}/presentations", headers=hdrs, timeout=10).json()
            if isinstance(pres, list) and pres:
                first_pres_id = pres[0]["id"]

        print(f"[lookup] apollo={apollo_id} doc={first_doc_id} creative={creative_id} pres={first_pres_id}")
        return apollo_id, first_doc_id, creative_id, first_pres_id
    except Exception as e:
        print(f"[lookup] WARNING: {e}")
        return None, None, None, None


# ── main ─────────────────────────────────────────────────────────────────────
def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--force-color-profile=srgb", "--font-render-hinting=none",
                  "--disable-features=TranslateUI", "--no-sandbox"],
        )

        # ── primary (recorded) context ───────────────────────────────────────
        ctx = browser.new_context(
            viewport={"width": W, "height": H},
            device_scale_factor=1,
            record_video_dir=str(VID_DIR),
            record_video_size={"width": W, "height": H},
        )
        ctx.add_init_script(OVERLAY)
        page = ctx.new_page()
        d = Director(page)

        # ════════════════════════════════════════════════════════════════════
        # SCENE 1 — Landing page
        # ════════════════════════════════════════════════════════════════════
        d.goto("/")
        d.pause(0.5)
        d.caption("SynergySpace: real-time collaboration built as six microservices")
        d.move(720, 440, 40)
        d.pause(4.5)

        d.scroll_to(620, 2)
        d.caption("A live editing session, re-enacted on the landing page itself")
        d.move(720, 540, 30)
        d.pause(3.0)

        d.scroll_el("#product", -40, 2.0)
        d.caption("Documents, slides, canvas and team workspaces — in one product")
        d.pause(2.5)

        d.scroll_el("#architecture", -20, 2.0)
        d.caption("Six services behind one gateway — hover a node to see what it owns")
        d.scroll_el("#architecture svg", -120, 1.4)
        for name in ["Auth", "Document", "Collab", "AI"]:
            nodes = page.locator("#architecture svg text", has_text=name)
            if nodes.count() > 0:
                d.to(nodes.first, steps=20)
                d.pause(1.3)

        d.scroll_el("#ai", -40, 2.0)
        d.caption("AI runs in its own Python service — isolated behind the same JWT check")
        d.pause(2.5)
        d.scroll_to(0, 1.8)

        # ════════════════════════════════════════════════════════════════════
        # SCENE 2 — Demo login
        # ════════════════════════════════════════════════════════════════════
        d.caption("One click into a pre-filled demo workspace — no sign-up needed")
        demo_btn = page.get_by_role("button", name="Try the live demo").first
        d.click(demo_btn, after=0.3)
        page.wait_for_url("**/dashboard", timeout=120_000)
        page.wait_for_load_state("networkidle")
        d.pause(2.5)
        d.caption("Dashboard: projects, documents, presentations and canvas")
        d.move(560, 400, 30)
        d.pause(2.5)

        # Dump storage & cookies AFTER demo login completes
        auth_token = page.evaluate("sessionStorage.getItem('auth_token')")
        apollo_id, first_doc_id, creative_id, first_pres_id = lookup_demo_ids(auth_token)

        session_dump = page.evaluate(
            "JSON.stringify(Object.fromEntries(Object.keys(sessionStorage).filter(k=>!k.startsWith('__')).map(k=>[k,sessionStorage.getItem(k)])))"
        )
        local_dump = page.evaluate(
            "JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])))"
        )
        cookies = ctx.cookies()

        # ════════════════════════════════════════════════════════════════════
        # SCENE 3 — Project → Document
        # ════════════════════════════════════════════════════════════════════
        d.caption("Projects group everything the team makes together")

        apollo_card = page.locator("a", has_text="Project Apollo").first
        if d.try_click(apollo_card, after=0.5, timeout=15_000):
            page.wait_for_load_state("networkidle")
        elif apollo_id:
            d.goto(f"/projects/{apollo_id}/documents")
        d.pause(1.5)

        if "/documents/" not in page.url:
            doc_link = page.locator('a[href^="/documents/"]').first
            if not d.try_click(doc_link, after=0.4, timeout=10_000) and first_doc_id:
                d.goto(f"/documents/{first_doc_id}")

        page.wait_for_url("**/documents/**", timeout=30_000)
        page.wait_for_load_state("networkidle")
        doc_url = page.url
        d.caption("A shared document")
        d.pause(2.5)

        # ── Teammate joins (hidden context WITH cookies + storage) ───────────
        ctx2 = browser.new_context(viewport={"width": 1280, "height": 800})
        if cookies:
            ctx2.add_cookies(cookies)
        ctx2.add_init_script(
            SETUP_ONLY
            + f"""
(() => {{
  const s = {session_dump};
  for (const k in s) sessionStorage.setItem(k, s[k]);
  const l = {local_dump};
  for (const k in l) localStorage.setItem(k, l[k]);
}})();
"""
        )
        mate = ctx2.new_page()
        mate.goto(doc_url, wait_until="networkidle", timeout=120_000)
        mate.wait_for_timeout(2000)

        d.caption("A teammate joins — live presence updates over WebSockets")
        collab_pill = page.locator("button", has_text="collaborator").first
        d.try_click(collab_pill, after=1.5, timeout=10_000)
        d.move(560, 400, 25)
        d.pause(1.5)

        # Teammate types in the document
        d.caption("Their edits stream into the document in real time")
        try:
            ta = mate.locator("textarea").first
            ta.wait_for(state="visible", timeout=15_000)
            ta.click()
            mate.keyboard.press("Control+End")
            mate.keyboard.type(
                "\n\nDecision\nShip per-service schemas first, then split the databases in Q3.",
                delay=50,
            )
        except Exception as e:
            print(f"[warn] teammate textarea: {e}")
        d.move(560, 580, 30)
        d.pause(3.0)

        # ════════════════════════════════════════════════════════════════════
        # SCENE 4 — AI assistant
        # ════════════════════════════════════════════════════════════════════
        print("[scene 4] AI assistant")
        d.caption("AI assistant: real Gemini calls routed through the gateway")
        ai_btn = page.get_by_role("button", name="AI", exact=True).first
        d.click(ai_btn, after=0.8)

        # Quick prompt chip fills the input; click input & press Enter to send
        d.try_click(page.locator("button", has_text="Summarize").first, after=0.4, timeout=5_000)
        ask = page.get_by_placeholder("Ask AI for assistance").first
        if d.try_click(ask, after=0.2, timeout=5_000):
            page.keyboard.press("Enter")

        # Wait for first assistant reply bubble (.items-start)
        reply = page.locator(".items-start .whitespace-pre-wrap").first
        try:
            reply.wait_for(state="visible", timeout=35_000)
        except Exception as e:
            print(f"[warn] AI reply 1: {e}")
        d.pause(4.0)

        # Second custom prompt
        if d.try_click(ask, after=0.3, timeout=8_000):
            page.keyboard.type("Turn the open question into a one-line recommendation.", delay=35)
            d.pause(0.3)
            page.keyboard.press("Enter")
            try:
                page.locator(".items-start .whitespace-pre-wrap").nth(1).wait_for(state="visible", timeout=35_000)
            except Exception as e:
                print(f"[warn] AI reply 2: {e}")
        d.pause(4.5)

        # ════════════════════════════════════════════════════════════════════
        # SCENE 5 — Team chat
        # ════════════════════════════════════════════════════════════════════
        print("[scene 5] Team chat")
        d.caption("Team chat, right next to the work")
        chat_btn = page.get_by_role("button", name="Chat", exact=True).first
        d.click(chat_btn, after=1.0)
        chat_in = page.get_by_placeholder("Enter your message").first
        d.click(chat_in, after=0.2)
        page.keyboard.type("Summary looks right. Can you own the schema split?", delay=35)
        page.keyboard.press("Enter")
        d.pause(1.5)

        try:
            mate_chat = mate.get_by_role("button", name="Chat", exact=True).first
            mate_chat.wait_for(state="visible", timeout=8_000)
            mate_chat.click()
            mate.wait_for_timeout(600)
            mate.get_by_placeholder("Enter your message").first.click()
            mate.keyboard.type("On it — will draft the migration plan today.", delay=30)
            mate.keyboard.press("Enter")
        except Exception as e:
            print(f"[warn] mate chat: {e}")
        d.pause(3.0)
        ctx2.close()

        # ════════════════════════════════════════════════════════════════════
        # SCENE 6 — Slide editor
        # ════════════════════════════════════════════════════════════════════
        d.caption("Presentations live in the same project")

        if creative_id and first_pres_id:
            d.goto(f"/projects/{creative_id}/presentations/{first_pres_id}")
        else:
            d.goto("/projects")
            pres_lnk = page.locator('a[href*="/presentations/"]').first
            d.try_click(pres_lnk, after=0.4, timeout=15_000)
        page.wait_for_load_state("networkidle")
        d.pause(2.0)

        slide_lnk = page.locator('a[href*="/slides/"]').first
        if d.try_click(slide_lnk, after=0.4, timeout=10_000):
            page.wait_for_load_state("networkidle")
        d.caption("A WYSIWYG 16:9 slide editor with templates")
        d.move(720, 450, 30)
        d.pause(3.5)

        # ════════════════════════════════════════════════════════════════════
        # SCENE 7 — Canvas
        # ════════════════════════════════════════════════════════════════════
        d.caption("A shared canvas for diagrams and rough thinking")
        if creative_id:
            d.goto(f"/projects/{creative_id}/canvas")
        else:
            d.goto("/dashboard/canvas")
        page.wait_for_load_state("networkidle")
        d.pause(1.5)

        d.try_click(page.locator("text=System Components").first, after=0.5, timeout=10_000)
        page.wait_for_timeout(3000)

        try:
            draw_btn = page.locator('button[title="Freehand Draw (P)"]').first
            if draw_btn.is_visible(timeout=5000):
                d.click(draw_btn, after=0.4)
            stage = page.locator("canvas").first
            stage.wait_for(state="visible", timeout=10_000)
            bb = stage.bounding_box()
            if bb:
                cx = bb["x"] + 435
                cy = bb["y"] + 232
                r  = 120
                pts = [(cx + r * math.cos(t/40*2*math.pi) * 1.05,
                        cy + r * 0.55 * math.sin(t/40*2*math.pi))
                       for t in range(0, 43)]
                d.move(*pts[0], steps=25)
                page.mouse.down()
                for px, py in pts[1:]:
                    page.mouse.move(px, py, steps=3)
                page.mouse.up()
        except Exception as e:
            print(f"[warn] canvas draw: {e}")

        d.caption("Every stroke syncs to all users in the room instantly")
        d.pause(3.0)

        # ════════════════════════════════════════════════════════════════════
        # SCENE 8 — Pricing / Billing
        # ════════════════════════════════════════════════════════════════════
        d.caption("Stripe billing — per org, activated only by a signed webhook")
        d.goto("/pricing")
        page.wait_for_load_state("networkidle")
        d.pause(1.5)
        d.move(720, 500, 30)
        d.scroll_to(360, 2.0)
        d.pause(2.5)

        # ════════════════════════════════════════════════════════════════════
        # SCENE 9 — Outro
        # ════════════════════════════════════════════════════════════════════
        d.caption("SynergySpace — 6 services · full source · MIT licence")
        d.move(720, 400, 25)
        d.pause(3.5)
        d.caption("")

        # ── Save video ───────────────────────────────────────────────────────
        raw_path = page.video.path()
        ctx.close()
        browser.close()

    webm_out = OUT_DIR / "synergyspace_demo.webm"
    mp4_out  = OUT_DIR / "synergyspace_demo.mp4"
    shutil.copy2(raw_path, webm_out)
    shutil.rmtree(VID_DIR, ignore_errors=True)
    print(f"\nWEBM saved -> {webm_out}")

    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        subprocess.run(
            [
                ffmpeg_exe, "-y",
                "-i", str(webm_out),
                "-c:v", "libx264", "-preset", "medium", "-crf", "23",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                str(mp4_out),
            ],
            check=True,
        )
        print(f"MP4 saved  -> {mp4_out}")
    except Exception as e:
        print(f"[warn] MP4 conversion skipped: {e}")

    return str(mp4_out if mp4_out.exists() else webm_out)


if __name__ == "__main__":
    video = main()
    print(f"Done: {video}")
