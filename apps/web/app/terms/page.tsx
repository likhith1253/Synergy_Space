'use client'

import Link from 'next/link'
import Navigation from '@/components/navigation'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TermsPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Navigation />

            <main className="flex-grow py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Link href="/">
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-bold">Terms of Service</h1>
                        <p className="text-muted-foreground">Last updated: June 2026</p>
                    </div>

                    <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
                            <p className="text-muted-foreground">
                                By accessing and using SynergySpace, you agree to these Terms of Service and our Privacy Policy. 
                                If you do not agree to these terms, please do not use our collaboration platform.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold">2. Service Description</h2>
                            <p className="text-muted-foreground">
                                SynergySpace provides a real-time collaboration platform for document editing, project management, 
                                and team communication. You are granted a limited, non-exclusive license to use the service 
                                in accordance with these terms and your selected subscription plan.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold">3. Account Responsibilities</h2>
                            <p className="text-muted-foreground">
                                You are responsible for maintaining the security of your account credentials and for all 
                                activities that occur under your account. You must notify us immediately of any unauthorized 
                                use of your account or any other breach of security.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold">4. Content and Data</h2>
                            <p className="text-muted-foreground">
                                You retain ownership of all content you create or upload to SynergySpace. We provide tools for 
                                real-time collaboration and document management, but you are responsible for ensuring 
                                your content complies with applicable laws and regulations.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold">5. Service Availability</h2>
                            <p className="text-muted-foreground">
                                We strive to maintain high service availability but do not guarantee uninterrupted access. 
                                We may perform maintenance that temporarily affects service availability. We will provide 
                                advance notice for scheduled maintenance when possible.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-semibold">6. Contact Us</h2>
                            <p className="text-muted-foreground">
                                For questions about these Terms, please contact us through your account settings or 
                                at support@collab.com.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
