import { SiteNav } from '@/components/landing/site-nav'

/** Marketing-page navigation: the fixed landing nav plus a spacer so content clears it. */
export default function Navigation() {
  return (
    <>
      <SiteNav />
      <div aria-hidden className="h-24" />
    </>
  )
}
