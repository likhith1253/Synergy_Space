import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { DemoModal } from '@/components/demo-modal'
import { ProductTour } from '@/components/product-tour'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'SynergySpace — real-time collaboration, built on microservices',
  description: 'Co-edit documents, slides and canvases in real time, with AI assistance and team workspaces. Six services behind one gateway.',
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/icon-light.svg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark.svg',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} ${display.variable} font-sans antialiased bg-background text-foreground`}>
        <AuthProvider>
          {children}
          <DemoModal />
          <ProductTour />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
