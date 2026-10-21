'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'

interface TourStep {
  title: string
  description: string
  targetSelector?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to SynergySpace',
    description: 'This dashboard is your workspace, the central hub for team collaboration. Let\'s take a quick tour of what you can do.',
    position: 'center'
  },
  {
    title: 'Projects Hub',
    description: 'Organize files, slide decks, and canvases into Projects. We\'ve pre-seeded realistic projects like \'Platform Launch Hub\' for you to explore.',
    targetSelector: 'a[href="/projects"]',
    position: 'right'
  },
  {
    title: 'Rich Documents',
    description: 'Create and edit documents simultaneously with your team. Real-time document updates are saved instantly as you type.',
    targetSelector: 'a[href="/dashboard/documents"]',
    position: 'right'
  },
  {
    title: 'Infinite Canvas & Collaboration',
    description: 'Brainstorm visually. Draw architecture diagrams, add moodboards, and sketch ideas together in real-time.',
    targetSelector: 'a[href="/dashboard/canvas"]',
    position: 'right'
  },
  {
    title: 'Team Presence & Chat',
    description: 'Coordinate easily. See which team members are online in real-time, view their profiles, and chat within projects.',
    targetSelector: 'a[href="/dashboard/team"]',
    position: 'right'
  },
  {
    title: 'Stay Notified',
    description: 'Never miss an update. The notifications hub will alert you to teammate activity and document modifications.',
    targetSelector: 'button[data-topbar-trigger="notifications"]',
    position: 'bottom'
  },
  {
    title: 'Sharing & Settings',
    description: 'Control permissions, manage organization workspace settings, and share project folders securely.',
    targetSelector: 'a[href="/dashboard/settings"]',
    position: 'right'
  },
  {
    title: 'Ready to Collaborate!',
    description: 'You\'re all set to explore. You can restart this guided tour anytime from the Help menu.',
    position: 'center'
  }
]

export function ProductTour() {
  const { isAuthenticated } = useAuth()
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    // Listen for custom event to restart tour
    const handleRestart = () => {
      setCurrentStep(0)
      setIsActive(true)
    }
    
    window.addEventListener('restart-tour', handleRestart)

    if (isAuthenticated) {
      const hasSeenTour = localStorage.getItem('hasSeenTour')
      if (!hasSeenTour) {
        // Small delay to let dashboard load
        const timer = setTimeout(() => {
          setIsActive(true)
        }, 1500)
        return () => clearTimeout(timer)
      }
    }
    
    return () => window.removeEventListener('restart-tour', handleRestart)
  }, [isAuthenticated])

  useEffect(() => {
    if (!isActive) return

    const step = TOUR_STEPS[currentStep]
    if (step.targetSelector && step.position !== 'center') {
      const updateRect = () => {
        const el = document.querySelector(step.targetSelector!)
        if (el) {
          setTargetRect(el.getBoundingClientRect())
        } else {
          setTargetRect(null)
        }
      }

      updateRect()
      // Update on resize or scroll
      window.addEventListener('resize', updateRect)
      window.addEventListener('scroll', updateRect, true)
      
      return () => {
        window.removeEventListener('resize', updateRect)
        window.removeEventListener('scroll', updateRect, true)
      }
    } else {
      setTargetRect(null)
    }
  }, [currentStep, isActive])

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = () => {
    setIsActive(false)
    localStorage.setItem('hasSeenTour', 'true')
  }

  const handleSkip = () => {
    setIsActive(false)
    localStorage.setItem('hasSeenTour', 'true')
  }

  if (!isActive) return null

  const step = TOUR_STEPS[currentStep]
  const isCenter = step.position === 'center' || !targetRect

  // Calculate position
  let popoverStyle: React.CSSProperties = {}
  
  if (!isCenter && targetRect) {
    const margin = 16
    const popoverWidth = 320
    
    if (step.position === 'right') {
      popoverStyle = {
        left: targetRect.right + margin,
        top: Math.max(margin, targetRect.top + targetRect.height / 2 - 100) // approximate centering
      }
    } else if (step.position === 'left') {
      popoverStyle = {
        left: targetRect.left - popoverWidth - margin,
        top: Math.max(margin, targetRect.top + targetRect.height / 2 - 100)
      }
    } else if (step.position === 'bottom') {
      popoverStyle = {
        left: Math.max(margin, targetRect.left + targetRect.width / 2 - popoverWidth / 2),
        top: targetRect.bottom + margin
      }
    }
    
    // Ensure it doesn't go off-screen right
    if (popoverStyle.left && typeof popoverStyle.left === 'number' && popoverStyle.left + popoverWidth > window.innerWidth) {
      popoverStyle.left = window.innerWidth - popoverWidth - margin
    }
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={isCenter ? undefined : handleNext} // Click outside goes to next if not center
      />
      
      {/* Target Highlight Cutout (Simulated with a box shadow) */}
      {!isCenter && targetRect && (
        <motion.div
          initial={false}
          animate={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
          transition={{ duration: 0.3 }}
          className="absolute z-[101] border-2 border-accent rounded-lg bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none"
        />
      )}

      {/* Popover */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          style={isCenter ? {} : popoverStyle}
          className={`absolute pointer-events-auto z-[102] w-full max-w-[320px] ${
            isCenter 
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
              : ''
          }`}
        >
          <Card className="border-accent/50 shadow-2xl overflow-hidden flex flex-col">
            {/* Header / Actions */}
            <div className="flex justify-between items-start p-4 pb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </div>
              <button 
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Close All Explanations"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Content */}
            <div className="px-4 pb-4">
              <h3 className="text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-secondary/50 border-t border-border/50 flex justify-between items-center mt-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkip}
                className="text-xs"
              >
                Close All Explanations
              </Button>
              
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrev}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={handleNext}
                  className="h-8 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    <>
                      <Check className="w-4 h-4 mr-1" /> Finish
                    </>
                  ) : (
                    <>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
