'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'

export default function SignInPage() {
  const router = useRouter()
  const { login, demoLogin, loading: authLoading, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setError(null)
    setDemoLoading(true)
    try {
      await demoLogin()
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed')
    } finally {
      setDemoLoading(false)
    }
  }

  const isLoading = loading || authLoading || demoLoading

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="space-y-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-center mb-6">
              
            </div>
          </motion.div>
          <CardTitle className="font-serif text-5xl font-normal tracking-tight">Sign In</CardTitle>
          <CardDescription className="text-base">
            Welcome back. Pick up where your team left off.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Demo Access Banner */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-5 p-4 rounded-lg bg-accent-soft border border-transparent flex flex-col gap-3"
          >
            <div>
              <p className="text-sm font-semibold text-accent">Want to try the platform first?</p>
            </div>
            <Button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="w-full h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 font-semibold"
            >
              <Compass className="w-4 h-4" />
              {demoLoading ? 'Preparing Demo Workspace...' : 'Launch Demo Workspace'}
            </Button>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </motion.div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11 bg-card text-base"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Link href="/auth/forgot-password">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground font-medium hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 bg-card text-base"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold mt-6"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  New here?
                </span>
              </div>
            </div>

            {/* Sign Up Link */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-full border-border text-foreground hover:bg-secondary text-base font-medium bg-card"
              asChild
            >
              <Link href="/auth/sign-up">Create Account</Link>
            </Button>
          </form>

          {/* Footer Text */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-accent hover:text-accent/80">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-accent hover:text-accent/80">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
