'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { Compass, UserPlus, X } from 'lucide-react'
import { Logo } from '@/components/logo'

export function DemoModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { demoLogin, isAuthenticated } = useAuth()

  useEffect(() => {
    // Show to unauthenticated users who haven't seen the demo modal
    const hasSeenDemo = localStorage.getItem('hasSeenDemoModal')
    
    if (!isAuthenticated && !hasSeenDemo) {
      // Small delay to let the page load first
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated])

  const handleClose = () => {
    setIsOpen(false)
    localStorage.setItem('hasSeenDemoModal', 'true')
  }

  const handleExploreDemo = async () => {
    setIsLoading(true)
    try {
      await demoLogin()
      localStorage.setItem('hasSeenDemoModal', 'true')
      router.push('/dashboard')
    } catch (error) {
      console.error('Demo login failed:', error)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  const handleCreateAccount = () => {
    handleClose()
    router.push('/auth/sign-up')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <Card className="border-border/50 shadow-2xl relative overflow-hidden">
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-accent"></div>
              
              <CardHeader className="space-y-4 pt-8 text-center relative z-10">
                <div className="mx-auto w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-2">
                  <Logo size={32} className="text-accent" />
                </div>
                <CardTitle className="text-2xl font-bold">Welcome to SynergySpace</CardTitle>
                <CardDescription className="text-base">
                  Choose your experience:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6 relative z-10">
                <Button 
                  onClick={handleExploreDemo} 
                  disabled={isLoading}
                  className="w-full h-14 text-lg font-medium bg-accent text-accent-foreground hover:bg-accent/90 flex items-center justify-center gap-2"
                >
                  <Compass className="w-5 h-5" />
                  {isLoading ? 'Preparing Demo Workspace...' : 'Explore Live Demo'}
                </Button>
                
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/30" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateAccount}
                  disabled={isLoading}
                  variant="outline" 
                  className="w-full h-14 text-lg font-medium border-border/50 hover:bg-secondary/50 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Create Account
                </Button>
              </CardContent>
              <CardFooter className="justify-center pb-6 text-sm text-muted-foreground">
                No credit card required
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
