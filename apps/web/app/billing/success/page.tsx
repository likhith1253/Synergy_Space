'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BillingSuccessPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full text-center space-y-6 bg-card p-8 rounded-xl border shadow-lg"
            >
                <div className="flex justify-center">
                    <CheckCircle className="w-16 h-16 text-success" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">Payment Successful!</h1>
                    <p className="text-muted-foreground">
                        Your subscription has been activated. You now have access to premium features.
                    </p>
                </div>

                <div className="pt-4">
                    <Link href="/dashboard">
                        <Button className="w-full gap-2" size="lg">
                            Go to Dashboard
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}
