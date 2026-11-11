'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiClient } from '@/lib/api-client'
import {
    Presentation,
    Plus,
    Clock,
    FolderOpen,
    ArrowRight,
    Loader2,
    LayoutTemplate,
    Palette,
    Monitor,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Project {
    id: string
    name: string
    description?: string
    updated_at: string
}

export default function DashboardPresentationsPage() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await ApiClient.get<{ projects: Project[] } | Project[]>('/projects')
                if (Array.isArray(data)) {
                    setProjects(data)
                } else if (Array.isArray((data as any).projects)) {
                    setProjects((data as any).projects)
                } else if (Array.isArray((data as any).data)) {
                    setProjects((data as any).data)
                } else {
                    setProjects([])
                }
            } catch (err) {
                setError('Failed to load projects')
            } finally {
                setLoading(false)
            }
        }
        fetchProjects()
    }, [])

    return (
        <div className="flex flex-col h-full overflow-auto bg-background">
            <div className="max-w-6xl mx-auto w-full p-8 md:p-12">

                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center">
                            <Presentation className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Presentations</h1>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                Build full slide decks from scratch with preloaded templates
                            </p>
                        </div>
                    </div>
                </div>

                {/* Feature highlights strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
                    {[
                        { icon: <LayoutTemplate className="w-5 h-5 text-accent" />, label: 'Templates', desc: 'Classic, Two-column, Quote…' },
                        { icon: <Palette className="w-5 h-5 text-accent" />, label: 'Backgrounds', desc: 'Colours per slide' },
                        { icon: <Monitor className="w-5 h-5 text-accent" />, label: 'Slide editor', desc: 'Full WYSIWYG 16:9' },
                        { icon: <span className="text-xl">⚡</span>, label: 'Live sync', desc: 'Real-time collaboration' },
                    ].map((f) => (
                        <div key={f.label} className="border rounded-xl p-4 bg-card flex flex-col gap-1">
                            <span>{f.icon}</span>
                            <span className="font-medium text-sm mt-1">{f.label}</span>
                            <span className="text-xs text-muted-foreground">{f.desc}</span>
                        </div>
                    ))}
                </div>

                {/* Templates preview row */}
                <div className="mb-10">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available templates</h2>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {[
                            { id: 'classic', name: 'Classic', desc: 'Title + full-width body', bg: '#ffffff', textDark: true },
                            { id: 'two-column', name: 'Two Columns', desc: 'Title + two side areas', bg: '#f8fafc', textDark: true },
                            { id: 'section-header', name: 'Section Header', desc: 'Big centered title', bg: '#172554', textDark: false },
                            { id: 'quote', name: 'Quote', desc: 'Styled quote + citation', bg: '#1e293b', textDark: false },
                            { id: 'blank', name: 'Blank', desc: 'Free-form blank slide', bg: '#fef3c7', textDark: true },
                        ].map((tpl) => (
                            <div
                                key={tpl.id}
                                className="shrink-0 w-44 h-28 rounded-xl border-2 border-border overflow-hidden flex flex-col justify-between p-3 shadow-sm"
                                style={{ backgroundColor: tpl.bg }}
                            >
                                <span
                                    className="text-xs font-bold truncate"
                                    style={{ color: tpl.textDark ? '#1e293b' : '#f1f5f9' }}
                                >
                                    {tpl.name}
                                </span>
                                <span
                                    className="text-[10px]"
                                    style={{ color: tpl.textDark ? '#64748b' : '#94a3b8' }}
                                >
                                    {tpl.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Project picker */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Open presentations from your projects</h2>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/projects/new">
                            <Plus className="w-4 h-4 mr-1.5" />
                            New project
                        </Link>
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="text-center py-16 text-destructive">{error}</div>
                ) : projects.length === 0 ? (
                    <div className="border-2 border-dashed rounded-2xl p-16 text-center">
                        <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                        <p className="text-muted-foreground mb-6 text-sm">
                            Create a project first — presentations live inside projects.
                        </p>
                        <Button asChild>
                            <Link href="/projects/new">
                                <Plus className="w-4 h-4 mr-2" />
                                Create a project
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}/presentations`}
                                className="group block border rounded-xl p-5 bg-card hover:border-blue-400/60 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center group-hover:bg-accent-soft transition-colors">
                                        <Presentation className="w-4 h-4 text-accent" />
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                                </div>
                                <h3 className="font-semibold text-base mb-1 truncate group-hover:text-accent transition-colors">
                                    {project.name}
                                </h3>
                                {project.description && (
                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                        {project.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                        {project.updated_at
                                            ? new Date(project.updated_at).toLocaleDateString()
                                            : 'N/A'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
