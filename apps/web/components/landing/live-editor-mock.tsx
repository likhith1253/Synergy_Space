'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, MessageSquare, PenTool, Presentation, Wand2 } from 'lucide-react'

/**
 * A scripted, looping re-enactment of a real editing session:
 * two remote cursors move, one types, the AI panel streams a summary.
 * Pure presentation — no network — so the landing page is instant.
 */

const TYPED = 'Billing moves behind the gateway so every service sees the same JWT.'
const AI_TEXT =
  'Summary: ship the gateway first, then migrate billing. Risk is low — auth is already verified at every hop.'

type Phase = 'idle' | 'typing' | 'ai' | 'done'

function Cursor({
  name,
  color,
  x,
  y,
}: {
  name: string
  color: string
  x: string[]
  y: string[]
}) {
  return (
    <motion.div
      className="pointer-events-none absolute z-20"
      animate={{ left: x, top: y }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] }}
    >
      <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
        <path d="M1 1l13 7.5-6 1.5-3 6L1 1z" fill={color} stroke="white" strokeWidth="1.2" />
      </svg>
      <span
        className="ml-3 -mt-1 inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
        style={{ background: color }}
      >
        {name}
      </span>
    </motion.div>
  )
}

export function LiveEditorMock() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [typed, setTyped] = useState('')
  const [ai, setAi] = useState('')

  useEffect(() => {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)))

    async function run() {
      while (!cancelled) {
        setTyped('')
        setAi('')
        setPhase('idle')
        await wait(1200)
        setPhase('typing')
        for (let i = 1; i <= TYPED.length && !cancelled; i++) {
          setTyped(TYPED.slice(0, i))
          await wait(38 + Math.random() * 40)
        }
        await wait(700)
        setPhase('ai')
        const words = AI_TEXT.split(' ')
        for (let i = 1; i <= words.length && !cancelled; i++) {
          setAi(words.slice(0, i).join(' '))
          await wait(70)
        }
        setPhase('done')
        await wait(4200)
      }
    }
    run()
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-lift">
      {/* window chrome */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">platform / gateway-rollout.doc</div>
        <div className="flex -space-x-1.5">
          {[
            ['LK', 'var(--presence-1)'],
            ['AR', 'var(--presence-2)'],
            ['MS', 'var(--presence-3)'],
          ].map(([i, c]) => (
            <span
              key={i}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[9px] font-semibold text-white"
              style={{ background: c }}
            >
              {i}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[52px_1fr_260px]">
        {/* rail */}
        <div className="hidden flex-col items-center gap-4 border-r border-border py-5 text-muted-foreground md:flex">
          <FileText className="h-4 w-4 text-foreground" />
          <Presentation className="h-4 w-4" />
          <PenTool className="h-4 w-4" />
          <MessageSquare className="h-4 w-4" />
        </div>

        {/* document */}
        <div className="relative min-h-[340px] px-6 py-7 text-left sm:px-10">
          <Cursor
            name="Aarav"
            color="var(--presence-2)"
            x={['70%', '18%', '12%', '40%', '70%']}
            y={['12%', '48%', '56%', '30%', '12%']}
          />
          <Cursor
            name="Maya"
            color="var(--presence-3)"
            x={['30%', '62%', '55%', '20%', '30%']}
            y={['78%', '20%', '70%', '85%', '78%']}
          />

          <p className="text-eyebrow mb-3">Design review · Wed</p>
          <h3 className="font-serif text-3xl leading-tight tracking-tight">Gateway rollout plan</h3>
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
            Every request enters through one gateway. It verifies the token, stamps a request ID and forwards
            to the service that owns the route.
          </p>
          <p className="mt-3 min-h-[44px] text-[14px] leading-relaxed text-foreground">
            <span className="rounded-sm bg-[color-mix(in_oklab,var(--presence-3)_14%,transparent)] px-0.5">
              Sockets stay on the collab service.
            </span>{' '}
            {typed}
            {phase === 'typing' && (
              <span className="animate-caret ml-px inline-block h-4 w-[2px] translate-y-0.5" style={{ background: 'var(--presence-2)' }} />
            )}
          </p>
          <div className="mt-5 space-y-2">
            {['Auth service issues + refreshes JWTs', 'Org service owns billing and Stripe webhooks', 'AI service is Python, behind the same check'].map(
              (t, i) => (
                <div key={t} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border ${
                      i < 2 ? 'border-foreground bg-foreground' : 'border-border'
                    }`}
                  >
                    {i < 2 && (
                      <svg viewBox="0 0 10 10" className="h-2 w-2 text-background">
                        <path d="M2 5.5l2 2 4-5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                      </svg>
                    )}
                  </span>
                  <span className={i < 2 ? 'line-through decoration-border' : ''}>{t}</span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* AI panel */}
        <div className="hidden border-l border-border bg-secondary/40 p-4 text-left md:block">
          <div className="flex items-center gap-2 text-[12px] font-medium">
            <Wand2 className="h-3.5 w-3.5 text-accent" />
            Assistant
          </div>
          <div className="mt-4 rounded-lg border border-border bg-card p-3 text-[12px] text-muted-foreground">
            Summarize this section for the team.
          </div>
          <AnimatePresence>
            {(phase === 'ai' || phase === 'done') && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 rounded-lg bg-accent-soft p-3 text-[12px] leading-relaxed text-foreground"
              >
                {ai}
                {phase === 'ai' && <span className="animate-caret ml-0.5 inline-block h-3 w-[2px] translate-y-0.5 bg-accent" />}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-6 space-y-1.5 font-mono text-[10px] text-muted-foreground">
            <div className="flex justify-between"><span>POST /ai/chat</span><span>gateway → ai</span></div>
            <div className="flex justify-between"><span>edit</span><span>socket → collab</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
