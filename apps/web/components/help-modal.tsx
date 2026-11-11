'use client'

import * as React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
    FolderPlus,
    FileText,
    UserPlus,
    Presentation,
    Palette,
    Play,
    Sparkles,
    Compass,
} from 'lucide-react'

interface HelpModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Welcome to Real-Time Collaboration
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6 pb-4">
                        {/* Restart Product Tour */}
                        <section className="bg-accent/5 rounded-lg p-4 border border-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h4 className="font-semibold text-foreground flex items-center gap-2">
                                    <Compass className="w-4 h-4 text-accent" />
                                    Guided Product Tour
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Restart the guided tour to walk through the main platform features.
                                </p>
                            </div>
                            <Button 
                                onClick={() => {
                                    onOpenChange(false)
                                    window.dispatchEvent(new CustomEvent('restart-tour'))
                                }}
                                className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0 font-medium"
                            >
                                Restart Tour
                            </Button>
                        </section>

                        {/* What the app does */}
                        <section>
                            <h3 className="text-lg font-semibold mb-2 text-foreground">
                                What is this app?
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                This is a real-time collaboration platform that allows teams to work together
                                seamlessly on documents, presentations, and creative canvases. Create projects,
                                invite team members, and collaborate in real-time with live cursors and instant updates.
                            </p>
                        </section>

                        {/* Video Tutorial */}
                        <section className="bg-muted/50 rounded-lg p-4 border border-border">
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <Play className="w-8 h-8" />
                                <div>
                                    <p className="font-medium text-foreground">Video Tutorial</p>
                                    <p className="text-sm">Product walkthrough coming soon</p>
                                </div>
                            </div>
                        </section>

                        {/* How to create a project */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <FolderPlus className="w-5 h-5 text-accent" />
                                <h3 className="text-lg font-semibold text-foreground">
                                    How to Create a Project
                                </h3>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-7">
                                <li>Navigate to the <strong>Dashboard</strong> or <strong>Projects</strong> page</li>
                                <li>Click the <strong>"New Project"</strong> button</li>
                                <li>Enter a project name and optional description</li>
                                <li>Click <strong>"Create"</strong> to finalize your new project</li>
                            </ol>
                        </section>

                        {/* How to create a document */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-5 h-5 text-success" />
                                <h3 className="text-lg font-semibold text-foreground">
                                    How to Create a Document
                                </h3>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-7">
                                <li>Open a project from the sidebar or Projects page</li>
                                <li>Click the <strong>"New Document"</strong> button</li>
                                <li>Enter a document title</li>
                                <li>Start typing – your changes are saved automatically</li>
                                <li>Collaborate in real-time with your team members</li>
                            </ol>
                        </section>

                        {/* How to invite team members */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <UserPlus className="w-5 h-5 text-accent" />
                                <h3 className="text-lg font-semibold text-foreground">
                                    How to Invite Team Members
                                </h3>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-7">
                                <li>Open a project you own or have admin access to</li>
                                <li>Click the <strong>"Invite"</strong> button in the project header</li>
                                <li>Enter the email address of the person you want to invite</li>
                                <li>Select their role (Admin, Editor, or Viewer)</li>
                                <li>Click <strong>"Send Invite"</strong> – they'll receive an email invitation</li>
                            </ol>
                        </section>

                        {/* How to use PPT */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <Presentation className="w-5 h-5 text-orange-500" />
                                <h3 className="text-lg font-semibold text-foreground">
                                    How to Use Presentations
                                </h3>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-7">
                                <li>Go to <strong>Presentations</strong> from the sidebar</li>
                                <li>Click <strong>"New Presentation"</strong> to create a slideshow</li>
                                <li>Add slides using the <strong>"+"</strong> button</li>
                                <li>Click on any slide to edit its content</li>
                                <li>Use the toolbar to add text, images, and shapes</li>
                                <li>Present your slides using the <strong>"Present"</strong> button</li>
                            </ol>
                        </section>

                        {/* How to use Canvas */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <Palette className="w-5 h-5 text-accent" />
                                <h3 className="text-lg font-semibold text-foreground">
                                    How to Use Canvas
                                </h3>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-7">
                                <li>Go to <strong>Canvas</strong> from the sidebar</li>
                                <li>Click <strong>"New Canvas"</strong> to create a whiteboard</li>
                                <li>Use the drawing tools to sketch, annotate, or diagram</li>
                                <li>Add shapes, sticky notes, and connectors</li>
                                <li>Collaborate with team members in real-time</li>
                                <li>Zoom and pan to navigate large canvases</li>
                            </ol>
                        </section>

                        {/* Tips */}
                        <section className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                            <h3 className="text-lg font-semibold mb-2 text-foreground">
                                💡 Quick Tips
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                <li>Use keyboard shortcuts for faster navigation</li>
                                <li>Look for the green dot to see who's online</li>
                                <li>All changes are saved automatically</li>
                                <li>Access settings from the sidebar to customize your experience</li>
                            </ul>
                        </section>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
