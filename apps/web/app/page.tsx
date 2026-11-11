import { SiteNav } from '@/components/landing/site-nav'
import { Hero } from '@/components/landing/hero'
import { Architecture } from '@/components/landing/architecture'
import { AISection, BillingStrip, FinalCTA, Product, SiteFooter, StackMarquee } from '@/components/landing/sections'

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteNav />
      <main>
        <Hero />
        <StackMarquee />
        <Product />
        <Architecture />
        <AISection />
        <BillingStrip />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  )
}
