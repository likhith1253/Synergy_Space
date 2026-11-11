'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Wordmark } from '@/components/logo'

const ease = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.8, ease },
}

/* ---------------------------------------------------------------- stack */

const STACK = ['Next.js', 'React', 'TypeScript', 'Express', 'Socket.IO', 'FastAPI', 'Python', 'PostgreSQL', 'Prisma', 'Stripe', 'Gemini', 'Docker', 'Jest', 'pytest', 'GitHub Actions']

export function StackMarquee() {
  return (
    <section className="border-y border-border py-6">
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max gap-12 pr-12">
          {[...STACK, ...STACK].map((s, i) => (
            <span key={i} className="flex items-center gap-12 font-mono text-[13px] text-muted-foreground">
              {s}
              <span className="h-1 w-1 rounded-full bg-border" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- product */

function DocVisual() {
  return (
    <div className="space-y-2.5">
      {[92, 78, 85, 40].map((w, i) => (
        <motion.div
          key={i}
          className="h-2 rounded-full bg-border"
          initial={{ width: 0 }}
          whileInView={{ width: `${w}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.1 * i, ease }}
        />
      ))}
      <div className="flex items-center gap-1.5 pt-2">
        <span className="h-3.5 w-[2px] animate-caret" style={{ background: 'var(--presence-2)' }} />
        <span className="rounded px-1 text-[10px] text-white" style={{ background: 'var(--presence-2)' }}>Aarav</span>
      </div>
    </div>
  )
}

function SlidesVisual() {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`aspect-[4/3] flex-1 rounded-md border border-border p-2 ${i === 1 ? 'bg-foreground' : 'bg-card'}`}
          whileHover={{ y: -4 }}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12 * i, duration: 0.6 }}
        >
          <div className={`h-1.5 w-2/3 rounded-full ${i === 1 ? 'bg-background/60' : 'bg-border'}`} />
          <div className={`mt-1.5 h-1 w-1/2 rounded-full ${i === 1 ? 'bg-background/30' : 'bg-border/70'}`} />
        </motion.div>
      ))}
    </div>
  )
}

function CanvasVisual() {
  return (
    <svg viewBox="0 0 220 90" className="w-full">
      <motion.path
        d="M10 70 C 50 10, 90 10, 120 50 S 190 80, 210 20"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease }}
      />
      <rect x="140" y="52" width="44" height="28" rx="4" fill="none" stroke="var(--presence-3)" strokeWidth="1.5" />
      <circle cx="40" cy="30" r="12" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  )
}

function TeamVisual() {
  const roles = [
    ['Owner', 'var(--presence-1)'],
    ['Admin', 'var(--presence-3)'],
    ['Editor', 'var(--presence-2)'],
    ['Viewer', 'var(--muted-foreground)'],
  ]
  return (
    <div className="space-y-1.5">
      {roles.map(([r, c], i) => (
        <motion.div
          key={r}
          className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px]"
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08 * i }}
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: c }} />
            {r}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{['all', 'manage', 'write', 'read'][i]}</span>
        </motion.div>
      ))}
    </div>
  )
}

const PRODUCT = [
  { n: '01', title: 'Documents', body: 'Rich-text editing with live cursors, presence and saved version snapshots.', visual: <DocVisual />, span: 'lg:col-span-2' },
  { n: '02', title: 'Presentations', body: 'Build slide decks with your team, in the same project as the docs they came from.', visual: <SlidesVisual />, span: '' },
  { n: '03', title: 'Canvas', body: 'A shared whiteboard for diagrams and rough thinking.', visual: <CanvasVisual />, span: '' },
  { n: '04', title: 'Workspaces & roles', body: 'Organizations, projects, email invites and four roles — enforced on every API route and every socket room.', visual: <TeamVisual />, span: 'lg:col-span-2' },
]

export function Product() {
  return (
    <section id="product" className="mx-auto max-w-6xl px-6 py-28">
      <motion.div {...fadeUp} className="grid gap-8 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="text-eyebrow">01 — Product</p>
          <h2 className="mt-4 font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">
            One workspace for
            <br />
            <em className="text-muted-foreground">everything a team makes.</em>
          </h2>
        </div>
        <p className="max-w-md text-[16px] leading-relaxed text-muted-foreground lg:justify-self-end">
          Documents, decks and drawings live side by side inside projects, so context never gets lost between tools.
        </p>
      </motion.div>

      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {PRODUCT.map((p, i) => (
          <motion.div
            key={p.n}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: i * 0.06 }}
            className={`group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-7 transition-shadow duration-500 hover:shadow-lift ${p.span}`}
          >
            <div className="flex items-start justify-between">
              <span className="font-mono text-xs text-muted-foreground">{p.n}</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </div>
            <div className="my-6 max-w-sm">{p.visual}</div>
            <div>
              <h3 className="text-xl font-medium tracking-tight">{p.title}</h3>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- AI */

export function AISection() {
  const actions = [
    { k: 'Generate', d: 'Draft a section from a one-line prompt.' },
    { k: 'Summarize', d: 'Condense a long document into what matters.' },
    { k: 'Autocomplete', d: 'Finish the sentence you are already writing.' },
  ]
  return (
    <section id="ai" className="mx-auto max-w-6xl px-6 py-28">
      <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
        <motion.div {...fadeUp}>
          <p className="text-eyebrow">03 — AI assistance</p>
          <h2 className="mt-4 font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">
            An assistant that
            <br />
            <em className="text-muted-foreground">stays in its lane.</em>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-muted-foreground">
            AI runs in its own Python service. It sees only what you send it, it checks the same token as everything
            else, and when the model provider has a bad day the rest of the workspace does not notice.
          </p>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {actions.map((a) => (
              <div key={a.k} className="flex items-baseline justify-between gap-6 py-4">
                <span className="font-medium">{a.k}</span>
                <span className="text-right text-sm text-muted-foreground">{a.d}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeUp} className="relative">
          <div className="rounded-2xl border border-border bg-card p-2 shadow-lift">
            <div className="rounded-xl bg-[#15171c] p-6 font-mono text-[12.5px] leading-relaxed text-[#c9cbd1]">
              <div className="flex items-center justify-between text-[11px] text-[#7d808a]">
                <span>request</span>
                <span>gateway → ai-service</span>
              </div>
              <pre className="mt-3 whitespace-pre-wrap">
{`POST /ai/chat
Authorization: Bearer eyJhbGciOi…
{
  "action": "summarize",
  "content": "Gateway rollout plan…"
}`}
              </pre>
              <div className="my-5 h-px bg-[#2a2d35]" />
              <div className="flex items-center justify-between text-[11px] text-[#7d808a]">
                <span>response · 200</span>
                <span>fastapi · gemini</span>
              </div>
              <motion.p
                className="mt-3 text-[#ecebe6]"
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
                viewport={{ once: true }}
                transition={{ duration: 2.2, ease: 'linear', delay: 0.4 }}
              >
                Ship the gateway first, then migrate billing behind it.
              </motion.p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- billing */

export function BillingStrip() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-28">
      <motion.div
        {...fadeUp}
        className="grid gap-10 overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr] lg:items-center"
      >
        <div>
          <p className="text-eyebrow">04 — Billing</p>
          <h3 className="mt-4 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            Real payments, wired end to end.
          </h3>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Stripe Checkout from the pricing page, a signed webhook into the Organization service, and the plan
            recorded against the org — not the user.
          </p>
          <Link href="/pricing" className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
            See pricing <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ol className="relative space-y-5 border-l border-border pl-6">
          {['Pick a plan on /pricing', 'Stripe Checkout session created by the org service', 'checkout.session.completed → signed webhook', 'Organization upgraded, limits lifted'].map((s, i) => (
            <motion.li
              key={s}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 * i, duration: 0.5 }}
              className="relative text-sm"
            >
              <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card">
                <Check className="h-2.5 w-2.5" />
              </span>
              {s}
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </section>
  )
}

/* ---------------------------------------------------------------- CTA + footer */

export function FinalCTA() {
  const router = useRouter()
  const { demoLogin } = useAuth()
  const [loading, setLoading] = useState(false)
  const go = async () => {
    setLoading(true)
    try {
      await demoLogin()
      router.push('/dashboard')
    } catch {
      setLoading(false)
    }
  }
  return (
    <section className="relative overflow-hidden bg-[#15171c] py-32 text-[#ecebe6]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <motion.div {...fadeUp} className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-serif text-5xl leading-[1.02] tracking-tight sm:text-7xl">
          Open a document.
          <br />
          <em className="text-[#8ea0ff]">Invite someone in.</em>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-[16px] text-[#a3a6ae]">
          The demo workspace is pre-filled with projects, documents and a team. Nothing to install.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={go}
            disabled={loading}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#ecebe6] px-6 text-[15px] font-medium text-[#15171c] transition-transform hover:-translate-y-0.5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Try the live demo
          </button>
          <a
            href="https://github.com/likhith1253/Synergy_Space"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-[#33363f] px-6 text-[15px] text-[#ecebe6] transition-colors hover:bg-white/5"
          >
            Read the source <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </motion.div>
    </section>
  )
}

export function SiteFooter() {
  const cols = {
    Product: [
      ['Features', '/#product'],
      ['Architecture', '/#architecture'],
      ['Pricing', '/pricing'],
    ],
    Account: [
      ['Sign in', '/auth/sign-in'],
      ['Create account', '/auth/sign-up'],
    ],
    Legal: [
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
    ],
  }
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Real-time collaboration, built as six services behind one gateway.
          </p>
        </div>
        {Object.entries(cols).map(([h, items]) => (
          <div key={h}>
            <p className="text-eyebrow">{h}</p>
            <ul className="mt-4 space-y-2.5">
              {items.map(([l, href]) => (
                <li key={l}>
                  <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl items-center justify-between border-t border-border px-6 py-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} SynergySpace · MIT licensed</span>
        <a href="https://github.com/likhith1253/Synergy_Space" target="_blank" rel="noreferrer" className="hover:text-foreground">
          GitHub
        </a>
      </div>
    </footer>
  )
}
