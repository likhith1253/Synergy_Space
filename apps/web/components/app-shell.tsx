'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from './app-sidebar'
import { Topbar } from './app-topbar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="hidden md:block w-64 shrink-0 bg-sidebar border-r border-sidebar-border"
      >
        <Sidebar />
      </motion.div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Topbar */}
        <div className="sticky top-0 z-50 overflow-visible border-b border-border bg-background/80 backdrop-blur-xl">
          <Topbar />
        </div>

        {/* Content Area */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 overflow-auto"
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}
