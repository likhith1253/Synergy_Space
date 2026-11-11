'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Logo } from '@/components/logo'

const ease = [0.22, 1, 0.36, 1] as const

const events = [
  { who: 'Aarav', what: 'edited “Gateway rollout plan”', c: 'var(--presence-2)' },
  { who: 'Maya', what: 'joined the document', c: 'var(--presence-3)' },
  { who: 'Assistant', what: 'summarized 4 paragraphs', c: '#8ea0ff' },
  { who: 'Lena', what: 'invited you as Editor', c: 'var(--presence-4)' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#15171c] p-12 text-[#ecebe6] lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <Link href="/" className="relative flex items-center gap-2">
          <Logo size={22} />
          <span className="text-[15px] font-semibold tracking-tight">SynergySpace</span>
        </Link>

        <div className="relative">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease }}
            className="max-w-md font-serif text-6xl leading-[1.0] tracking-tight"
          >
            Your team,
            <br />
            <em className="text-[#8ea0ff]">on the same page.</em>
          </motion.h1>

          <div className="mt-12 max-w-sm space-y-2">
            {events.map((e, i) => (
              <motion.div
                key={e.who}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.15, duration: 0.6, ease }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.c }} />
                <span className="font-medium">{e.who}</span>
                <span className="truncate text-[#a3a6ae]">{e.what}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-[11px] uppercase tracking-[0.18em] text-[#7d808a]">
          Documents · Slides · Canvas · AI
        </p>
      </aside>

      <main className="flex w-full items-center justify-center p-6 sm:p-10 lg:w-[54%]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="w-full max-w-md"
        >
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <Logo size={22} />
            <span className="text-[15px] font-semibold tracking-tight">SynergySpace</span>
          </Link>
          {children}
        </motion.div>
      </main>
    </div>
  )
}
