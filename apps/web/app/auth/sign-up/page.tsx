'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, CheckCircle2, Compass, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { getInvite, InviteInfo } from '@/lib/api-hooks'

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('inviteToken')
  const { demoLogin, loading: authLoading } = useAuth()

  const [fullName, setFullName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [verifyingInvite, setVerifyingInvite] = useState(false)
  
  // NEW: State to show success message instead of crashing
  const [verificationSent, setVerificationSent] = useState(false)

  useEffect(() => {
    async function verifyToken() {
      if (inviteToken) {
        setVerifyingInvite(true)
        try {
          const info = await getInvite(inviteToken)
          if (info) {
            setInviteInfo(info)
            setEmail(info.email)
          }
        } catch (err) {
          console.error("Invalid invite token", err)
          setError("Invalid or expired invite token")
        } finally {
          setVerifyingInvite(false)
        }
      }
    }
    verifyToken()
  }, [inviteToken])

  const passwordStrength = {
    hasLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
  }

  const isPasswordStrong =
    passwordStrength.hasLength &&
    passwordStrength.hasUppercase &&
    passwordStrength.hasNumber

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fullName || !organizationName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!isPasswordStrong) {
      setError('Password must be at least 8 characters with uppercase and number')
      return
    }

    if (loading || authLoading) return

    setLoading(true)
    try {
      // Direct fetch bypasses the useAuth context crasher for the new Email Verification flow
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          organization_name: organizationName,
          inviteToken: inviteToken || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Registration failed');
      }

      if (data.success) {
        // Show the check email screen
        setVerificationSent(true);
      }
    } catch (err) {
      console.error('[SignUpForm] Registration error:', err)
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoFallback = async () => {
    setLoading(true)
    setError(null)
    try {
      await demoLogin()
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed')
    } finally {
      setLoading(false)
    }
  }

  const isLoading = loading || authLoading || verifyingInvite

  // SUCCESS SCREEN: Shows after they submit the form
  if (verificationSent) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="border-0 bg-transparent shadow-none text-center py-8">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="text-base mt-2">
              We have sent a verification link to <strong>{email}</strong>. 
              <br /><br />
              Please click the link to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/auth/sign-in')}>
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

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
          <CardTitle className="font-serif text-5xl font-normal tracking-tight">
            {inviteInfo ? 'Join the Team' : 'Create Account'}
          </CardTitle>
          <CardDescription className="text-base">
            {inviteInfo
              ? `You've been invited to join ${inviteInfo.project.name}`
              : 'Set up your workspace in under a minute.'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!inviteInfo && (
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
                onClick={handleDemoFallback}
                disabled={isLoading}
                className="w-full h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 font-semibold"
              >
                <Compass className="w-4 h-4" />
                {loading ? 'Preparing Demo Workspace...' : 'Launch Demo Workspace'}
              </Button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {inviteInfo && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3 text-sm text-primary mb-4">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Invitation Accepted</p>
                  <p className="opacity-90">Creating account for {inviteInfo.email}</p>
                </div>
              </div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
                
                <div className="pt-2 border-t border-destructive/20">
                  <p className="text-sm font-medium text-foreground mb-3">
                    Having trouble creating an account? You can still explore the platform immediately.
                  </p>
                  <Button
                    type="button"
                    onClick={handleDemoFallback}
                    disabled={isLoading}
                    className="w-full h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 font-semibold"
                  >
                    <Compass className="w-4 h-4" />
                    {loading ? 'Preparing Demo Workspace...' : 'Launch Demo Workspace'}
                  </Button>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                className="h-11 bg-card text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-sm font-medium">Organization Name</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Acme Inc"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={isLoading}
                className="h-11 bg-card text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || !!inviteInfo}
                className="h-11 bg-card text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 bg-card text-base"
              />
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${passwordStrength.hasLength ? 'bg-success' : 'bg-muted'}`} />
                  <span className="text-xs text-muted-foreground">At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${passwordStrength.hasUppercase ? 'bg-success' : 'bg-muted'}`} />
                  <span className="text-xs text-muted-foreground">One uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-colors ${passwordStrength.hasNumber ? 'bg-success' : 'bg-muted'}`} />
                  <span className="text-xs text-muted-foreground">One number</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 bg-card text-base"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold mt-6"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Already have an account?
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-full border-border text-foreground hover:bg-secondary text-base font-medium bg-card"
              asChild
            >
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-accent hover:text-accent/80">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-accent hover:text-accent/80">Privacy Policy</Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpForm />
    </Suspense>
  )
}