'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Presentation, Plus, Search, Calendar, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProjectPresentations, createPresentation, type Presentation as PresentationType } from '@/lib/presentations';
import { ApiClient } from '@/lib/api-client';

export default function ProjectSlidesPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const [presentations, setPresentations] = useState<PresentationType[]>([]);
    const [projectName, setProjectName] = useState('Project');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [showRedirect, setShowRedirect] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId) return;

            try {
                setLoading(true);
                // Fetch project details for the name
                const projectData = await ApiClient.get<{ name: string }>(`/projects/${projectId}`);
                setProjectName(projectData.name);

                const fetchedPresentations = await getProjectPresentations(projectId);
                setPresentations(fetchedPresentations);
            } catch (err) {
                console.error('Failed to load project data:', err);
                setError('Failed to load presentations');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    const handleCreatePresentation = async () => {
        try {
            setCreating(true);
            const newPresentation = await createPresentation('Untitled Presentation', projectId);
            router.push(`/projects/${projectId}/presentations/${newPresentation.id}`);
        } catch (err) {
            console.error('Failed to create presentation:', err);
            setError('Failed to create presentation');
        } finally {
            setCreating(false);
        }
    };

    if (showRedirect && presentations.length === 0) {
        return (
            <div className="flex-1 overflow-auto bg-background">
                <div className="p-8 max-w-4xl mx-auto">
                    <div className="text-center py-20">
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8 mb-8">
                            <div className="flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-4">Slides Now Live in Presentations</h2>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                We&apos;ve upgraded slides to work within presentations for better organization. 
                                Create your first presentation to start building slides.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Button onClick={handleCreatePresentation} disabled={creating}>
                                    {creating ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create First Presentation
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={() => setShowRedirect(false)}>
                                    View All Presentations
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-background">
            <div className="p-8 max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 text-muted-foreground mb-4">
                        <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <span>/</span>
                        <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
                            {projectName}
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">Presentations</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Presentations</h1>
                            <p className="text-muted-foreground mt-1">
                                Organize your slides in presentations for {projectName}
                            </p>
                        </div>
                        <Button onClick={handleCreatePresentation} disabled={creating} className="shrink-0">
                            {creating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Presentation
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Filters/Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search presentations..." className="pl-10" />
                    </div>
                </div>

                {/* Presentations Grid */}
                {error ? (
                    <div className="text-center py-12 text-destructive">
                        <p>{error}</p>
                    </div>
                ) : presentations.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg">
                        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Presentation className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No presentations yet</h3>
                        <p className="text-muted-foreground mb-6">Create your first presentation to start organizing slides</p>
                        <Button onClick={handleCreatePresentation} disabled={creating} variant="outline">
                            Create Presentation
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {presentations.map((presentation) => (
                            <Link href={`/projects/${projectId}/presentations/${presentation.id}`} key={presentation.id} className="block group">
                                <div className="border rounded-lg p-5 hover:border-primary/50 hover:shadow-md transition-all h-full bg-card flex flex-col">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                                            <Presentation className="w-6 h-6 text-primary" />
                                        </div>
                                        <button className="text-muted-foreground hover:text-foreground">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
                                        {presentation.title || 'Untitled'}
                                    </h3>
                                    <div className="flex items-center text-xs text-muted-foreground mt-auto pt-2">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        <span>Updated {new Date(presentation.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
