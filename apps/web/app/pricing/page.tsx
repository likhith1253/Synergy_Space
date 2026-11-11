'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Check, Globe, HelpCircle } from 'lucide-react'
import Navigation from '@/components/navigation'
import { useAuth } from '@/lib/auth-context'
import { ApiClient } from '@/lib/api-client'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type PricingPlan = {
    name: string
    description: string
    price: {
        IN: string
        GLOBAL: string
    }
    features: string[]
    popular?: boolean
}

const PLANS: PricingPlan[] = [
    {
        name: 'Starter',
        description: 'Essential collaboration features for individuals',
        price: {
            IN: '₹0',
            GLOBAL: '$0',
        },
        features: [
            'Up to 3 active documents',
            'Real-time collaboration',
            '7-day version retention',
            'Standard support',
        ],
    },
    {
        name: 'Professional',
        description: 'Advanced features for individual professionals',
        price: {
            IN: '₹499',
            GLOBAL: '$10',
        },
        features: [
            'Unlimited documents',
            'Advanced collaboration tools',
            '30-day version retention',
            'Priority support',
            'Document export capabilities',
        ],
        popular: true,
    },
    {
        name: 'Enterprise',
        description: 'Scalable solution for organizations',
        price: {
            IN: '₹999',
            GLOBAL: '$25',
        },
        features: [
            'All Professional features',
            'Centralized team workspace',
            'Administrative controls',
            'Activity audit logs',
            'Single sign-on (SSO)',
        ],
    },
]

export default function PricingPage() {
    const { user, isAuthenticated } = useAuth()
    const [country, setCountry] = useState<'IN' | 'GLOBAL'>('GLOBAL')
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        // Auto-detect country via browser locale
        const locale = navigator.language || navigator.languages[0]
        if (locale?.includes('IN')) {
            setCountry('IN')
        }
    }, [])

    const handleCheckout = async (planName: string) => {
        if (!isAuthenticated || !user) {
            router.push('/auth/sign-in?redirect=/pricing')
            return
        }

        if (!user.organization?.id) {
            alert('No organization found. Please create one first.')
            return
        }

        setIsLoading(planName)

        try {
            // Map plan name to ID expected by backend
            const planId = planName.toLowerCase() === 'team' ? 'team-monthly' : 'pro-monthly'

            const response = await ApiClient.post<{ url: string }>('/billing/checkout', {
                planId,
                organizationId: user.organization.id,
                successUrl: `${window.location.origin}/billing/success`,
                cancelUrl: `${window.location.origin}/billing/cancel`,
            })

            if (response.url) {
                window.location.href = response.url
            }
        } catch (error) {
            console.error('Checkout failed:', error)
            alert('Failed to start checkout. Please try again.')
        } finally {
            setIsLoading(null)
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Navigation />

            <main className="flex-grow py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto space-y-12">

                    {/* Header */}
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                            Flexible Pricing Plans
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Select the plan that aligns with your team's requirements. Scale as needed.
                        </p>
                    </div>

                    {/* Country Selector */}
                    <div className="flex justify-center items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full">
                            <Globe className="w-4 h-4" />
                            <span>Viewing pricing for:</span>
                        </div>
                        <Select
                            value={country}
                            onValueChange={(val) => setCountry(val as 'IN' | 'GLOBAL')}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IN">India (INR)</SelectItem>
                                <SelectItem value="GLOBAL">International (USD)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid md:grid-cols-3 gap-8 pt-8">
                        {PLANS.map((plan, index) => (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className={`relative h-full flex flex-col ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
                                                Most Popular
                                            </Badge>
                                        </div>
                                    )}

                                    <CardHeader>
                                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                        <CardDescription>{plan.description}</CardDescription>
                                    </CardHeader>

                                    <CardContent className="flex-grow space-y-6">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-bold">
                                                {plan.price[country]}
                                            </span>
                                            <span className="text-muted-foreground">/month</span>
                                        </div>

                                        <ul className="space-y-3">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-center gap-3 text-sm">
                                                    <Check className="w-4 h-4 text-success shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>

                                    <CardFooter>
                                        {plan.name === 'Free' ? (
                                            <Button
                                                className="w-full"
                                                variant="outline"
                                                size="lg"
                                                onClick={() => router.push('/dashboard')}
                                            >
                                                Get Started
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full"
                                                variant={plan.popular ? 'default' : 'outline'}
                                                size="lg"
                                                disabled={isLoading === plan.name}
                                                onClick={() => handleCheckout(plan.name)}
                                            >
                                                {isLoading === plan.name ? 'Processing...' : 'Upgrade Now'}
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* FAO / Questions */}
                    <div className="text-center pt-12 text-muted-foreground">
                        <p className="flex items-center justify-center gap-2">
                            <HelpCircle className="w-4 h-4" />
                            Have questions? Contact our support team.
                        </p>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    )
}
