'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { LiveEditorMock } from './live-editor-mock'

const ease = [0.22, 1, 0.36, 1] as const

function RevealLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: '105%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, delay, ease }}
      >
        {children}
      </motion.span>
    </span>
  )
}

export function Hero() {
  const router = useRouter()
  const { demoLogin } = useAuth()
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const rotateX = useTransform(scrollYProgress, [0, 0.5], [14, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.94, 1])
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -40])

  const tryDemo = async () => {
    setLoading(true)
    try {
      await demoLogin()
      router.push('/dashboard')
    } catch (err) {
      console.error('Demo login failed', err)
      setLoading(false)
    }
  }

  return (
    <section ref={ref} className="relative overflow-hidden pt-36 pb-24 sm:pt-44">
      <div className="bg-grid mask-fade-radial pointer-events-none absolute inset-0 -top-20" />
      <div
        className="pointer-events-none absolute left-1/2 top-40 h-[480px] w-[900px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, var(--accent-soft), transparent)' }}
      />

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <motion.a
          href="#architecture"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="group inline-flex items-center gap-3 rounded-full border border-border bg-card/70 py-1 pl-1 pr-3 text-[13px] text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
        >
          <span className="rounded-full bg-foreground px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-background">
            6 services
          </span>
          One gateway, real-time sync, AI and billing
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </motion.a>

        <h1 className="mx-auto mt-8 max-w-4xl font-serif text-[52px] leading-[0.98] tracking-[-0.02em] sm:text-7xl lg:text-[88px]">
          <RevealLine delay={0.1}>Write, sketch and present</RevealLine>
          <RevealLine delay={0.22}>
            <em className="text-accent">together</em>, in real time.
          </RevealLine>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease }}
          className="mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-muted-foreground"
        >
          SynergySpace is a shared workspace for documents, slides and canvases — with live presence, an AI
          assistant, and team workspaces with role-based access. Built as a set of independent services.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <button
            onClick={tryDemo}
            disabled={loading}
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Opening workspace
              </>
            ) : (
              <>
                Try the live demo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
          <Link
            href="/auth/sign-up"
            className="inline-flex h-12 items-center rounded-full border border-border bg-card px-6 text-[15px] font-medium transition-colors hover:bg-secondary"
          >
            Create an account
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-4 text-xs text-muted-foreground"
        >
          No sign-up needed for the demo. Free-tier hosting — the first load can take ~30 s while services wake.
        </motion.p>
      </div>

      <div className="relative mx-auto mt-16 max-w-5xl px-4 [perspective:1600px]">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.5, ease }}
        >
          <motion.div style={{ rotateX, scale, y }} className="origin-top">
            <LiveEditorMock />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
