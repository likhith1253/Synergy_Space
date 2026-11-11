'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Wordmark } from '@/components/logo'

const links = [
  { label: 'Product', href: '/#product' },
  { label: 'Architecture', href: '/#architecture' },
  { label: 'AI', href: '/#ai' },
  { label: 'Pricing', href: '/pricing' },
]

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`flex w-full items-center justify-between rounded-full border px-3 py-2 pl-5 transition-all duration-500 ${
          scrolled
            ? 'max-w-3xl border-border bg-card/80 shadow-soft backdrop-blur-xl'
            : 'max-w-6xl border-transparent bg-transparent'
        }`}
      >
        <Link href="/" aria-label="SynergySpace home">
          <Wordmark />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <Link
            href="/auth/sign-in"
            className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-px"
          >
            Get started
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-2 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute inset-x-4 top-20 rounded-2xl border border-border bg-card p-3 shadow-lift md:hidden"
          >
            {links.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm hover:bg-secondary"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <Link href="/auth/sign-in" className="rounded-lg border border-border px-3 py-2 text-center text-sm">
                Sign in
              </Link>
              <Link href="/auth/sign-up" className="rounded-lg bg-primary px-3 py-2 text-center text-sm text-primary-foreground">
                Get started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
