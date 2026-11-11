'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type Service = {
  id: string
  name: string
  route: string
  stack: string
  port: string
  y: number
  owns: string
  external?: { label: string; y: number }
  db: boolean
}

const SERVICES: Service[] = [
  { id: 'auth', name: 'Auth', route: '/auth', stack: 'Express · TS', port: ':3001', y: 70, db: true,
    owns: 'Sign-up, email verification, login, refresh-token rotation and password reset. Issues the JWT every other service verifies.' },
  { id: 'org', name: 'Organization', route: '/orgs · /billing', stack: 'Express · TS', port: ':3004', y: 160, db: true,
    external: { label: 'Stripe', y: 160 },
    owns: 'Organizations, members and roles. Owns Stripe Checkout and the signed webhook that activates a subscription.' },
  { id: 'docs', name: 'Document', route: '/projects · /documents', stack: 'Express · TS', port: ':3002', y: 250, db: true,
    owns: 'Projects, documents, versions, slides, canvases, invites and messages — the system of record for content.' },
  { id: 'collab', name: 'Collab', route: '/socket.io', stack: 'Socket.IO', port: ':3003', y: 340, db: false,
    owns: 'WebSocket rooms per document and organization: edits, cursors and presence. Stateless relay; persists through the Document service.' },
  { id: 'ai', name: 'AI', route: '/ai', stack: 'FastAPI · Python', port: ':8001', y: 430, db: false,
    external: { label: 'Gemini', y: 430 },
    owns: 'Generation, summarization and autocomplete. A Python service behind the same JWT check — the right language for the job.' },
]

const GW = { x: 300, y: 250 }
const SVC_X = 520
const DB = { x: 820, y: 210 }
const EXT_X = 820

function path(fromX: number, fromY: number, toX: number, toY: number) {
  const mx = (fromX + toX) / 2
  return `M${fromX},${fromY} C${mx},${fromY} ${mx},${toY} ${toX},${toY}`
}

export function Architecture() {
  const [active, setActive] = useState('collab')
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    if (hovering) return
    const t = setInterval(() => {
      setActive((cur) => SERVICES[(SERVICES.findIndex((s) => s.id === cur) + 1) % SERVICES.length].id)
    }, 3200)
    return () => clearInterval(t)
  }, [hovering])

  const current = SERVICES.find((s) => s.id === active)!

  return (
    <section id="architecture" className="relative border-y border-border bg-card py-28">
      <div className="bg-grid mask-fade-y pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div>
            <p className="text-eyebrow">02 — Architecture</p>
            <h2 className="mt-4 font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">
              Not one app.
              <br />
              <em className="text-muted-foreground">Six services.</em>
            </h2>
          </div>
          <p className="max-w-lg text-[16px] leading-relaxed text-muted-foreground">
            SynergySpace was built to learn microservices by actually running them. Each domain lives in its own
            process with its own port, Dockerfile and test suite; the browser only ever talks to a single gateway.
            Hover a service to see what it owns.
          </p>
        </div>

        <div
          className="mt-14 overflow-hidden rounded-2xl border border-border bg-background/60 backdrop-blur"
          onMouseLeave={() => setHovering(false)}
        >
          <div className="overflow-x-auto">
            <svg viewBox="0 0 1000 500" className="min-w-[760px] w-full" role="img" aria-label="Service architecture diagram">
              {/* web → gateway */}
              <path id="p-web" d={path(140, GW.y, GW.x - 70, GW.y)} stroke="var(--foreground)" strokeWidth="1.5" fill="none" />
              <circle r="4" fill="var(--accent)">
                <animateMotion dur="1.6s" repeatCount="indefinite" path={path(140, GW.y, GW.x - 70, GW.y)} />
              </circle>

              {SERVICES.map((s) => {
                const on = s.id === active
                const d = path(GW.x + 70, GW.y, SVC_X - 70, s.y)
                return (
                  <g key={s.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke={on ? 'var(--accent)' : 'var(--border)'}
                      strokeWidth={on ? 2 : 1.5}
                      strokeDasharray={on ? '6 6' : undefined}
                      className={on ? 'animate-dash' : ''}
                      style={{ transition: 'stroke 300ms' }}
                    />
                    {on && (
                      <circle r="4.5" fill="var(--accent)">
                        <animateMotion dur="1.3s" repeatCount="indefinite" path={d} />
                      </circle>
                    )}
                    {s.db && (
                      <path
                        d={path(SVC_X + 70, s.y, DB.x - 60, DB.y)}
                        fill="none"
                        stroke={on ? 'var(--foreground)' : 'var(--border)'}
                        strokeWidth="1.2"
                        strokeDasharray="3 5"
                        style={{ transition: 'stroke 300ms' }}
                      />
                    )}
                    {s.external && (
                      <path
                        d={path(SVC_X + 70, s.y, EXT_X - 60, s.id === 'ai' ? 430 : 330)}
                        fill="none"
                        stroke={on ? 'var(--foreground)' : 'var(--border)'}
                        strokeWidth="1.2"
                        style={{ transition: 'stroke 300ms' }}
                      />
                    )}

                    <g
                      onMouseEnter={() => {
                        setHovering(true)
                        setActive(s.id)
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={SVC_X - 70}
                        y={s.y - 26}
                        width="140"
                        height="52"
                        rx="10"
                        fill={on ? 'var(--foreground)' : 'var(--card)'}
                        stroke={on ? 'var(--foreground)' : 'var(--border)'}
                        style={{ transition: 'fill 300ms' }}
                      />
                      <text x={SVC_X - 56} y={s.y - 4} fontSize="14" fontWeight="600" fill={on ? 'var(--background)' : 'var(--foreground)'}>
                        {s.name}
                      </text>
                      <text x={SVC_X - 56} y={s.y + 14} fontSize="10" fontFamily="var(--font-geist-mono)" fill={on ? 'var(--background)' : 'var(--muted-foreground)'} opacity="0.8">
                        {s.stack} {s.port}
                      </text>
                    </g>
                  </g>
                )
              })}

              {/* web app */}
              <rect x="20" y={GW.y - 34} width="120" height="68" rx="12" fill="var(--card)" stroke="var(--border)" />
              <text x="38" y={GW.y - 6} fontSize="14" fontWeight="600" fill="var(--foreground)">Web app</text>
              <text x="38" y={GW.y + 14} fontSize="10" fontFamily="var(--font-geist-mono)" fill="var(--muted-foreground)">Next.js · React</text>

              {/* gateway */}
              <rect x={GW.x - 70} y={GW.y - 44} width="140" height="88" rx="14" fill="var(--accent)" />
              <text x={GW.x - 54} y={GW.y - 12} fontSize="15" fontWeight="600" fill="#fff">API Gateway</text>
              <text x={GW.x - 54} y={GW.y + 8} fontSize="10" fontFamily="var(--font-geist-mono)" fill="#fff" opacity="0.85">Express :8000</text>
              <text x={GW.x - 54} y={GW.y + 26} fontSize="10" fontFamily="var(--font-geist-mono)" fill="#fff" opacity="0.85">routing · request-id</text>

              {/* database */}
              <g>
                <ellipse cx={DB.x + 40} cy={DB.y - 26} rx="100" ry="12" fill="var(--card)" stroke="var(--border)" />
                <path d={`M${DB.x - 60},${DB.y - 26} v60 a100,12 0 0 0 200,0 v-60`} fill="var(--card)" stroke="var(--border)" />
                <ellipse cx={DB.x + 40} cy={DB.y - 26} rx="100" ry="12" fill="var(--card)" stroke="var(--border)" />
                <text x={DB.x - 36} y={DB.y + 10} fontSize="14" fontWeight="600" fill="var(--foreground)">PostgreSQL</text>
                <text x={DB.x - 36} y={DB.y + 28} fontSize="10" fontFamily="var(--font-geist-mono)" fill="var(--muted-foreground)">shared Prisma schema</text>
              </g>

              {/* externals */}
              {[
                { label: 'Stripe', sub: 'checkout · webhooks', y: 330 },
                { label: 'Google Gemini', sub: 'LLM API', y: 430 },
              ].map((e) => (
                <g key={e.label}>
                  <rect x={EXT_X - 60} y={e.y - 24} width="200" height="48" rx="10" fill="none" stroke="var(--border)" strokeDasharray="4 4" />
                  <text x={EXT_X - 44} y={e.y - 2} fontSize="13" fontWeight="600" fill="var(--foreground)">{e.label}</text>
                  <text x={EXT_X - 44} y={e.y + 14} fontSize="10" fontFamily="var(--font-geist-mono)" fill="var(--muted-foreground)">{e.sub}</text>
                </g>
              ))}

              <text x="20" y="485" fontSize="10" fontFamily="var(--font-geist-mono)" fill="var(--muted-foreground)">
                HTTPS + WebSocket in · JWT verified in every service · one Prisma package shared across services
              </text>
            </svg>
          </div>

          <div className="border-t border-border p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-baseline"
              >
                <div>
                  <p className="font-serif text-2xl">{current.name} service</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{current.route}</p>
                </div>
                <p className="text-[15px] leading-relaxed text-muted-foreground">{current.owns}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Single front door', 'The gateway is the only public surface. Services stay on private ports and trust nothing they did not verify.'],
            ['Polyglot by choice', 'Node for I/O-heavy APIs and sockets; Python for AI, where the ecosystem is. One contract: HTTP + JWT.'],
            ['Isolated failure', 'If the AI provider is down, editing and billing keep working. Health, ready and live probes on every service.'],
            ['Tested in CI', 'Jest suites for auth, permissions, sockets and billing; pytest for the AI service — run on every push.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-card p-6">
              <p className="font-medium">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
