'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Presentation, Plus, Search, Calendar, MoreVertical, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProjectPresentations, createPresentation, type Presentation as PresentationType } from '@/lib/presentations';
import { createPresentationSlide } from '@/lib/slides';
import { aiService } from '@/lib/ai-service';
import { ApiClient } from '@/lib/api-client';

export default function ProjectPresentationsPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const [presentations, setPresentations] = useState<PresentationType[]>([]);
    const [projectName, setProjectName] = useState('Project');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

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

    const handleGeneratePresentation = async () => {
        const prompt = window.prompt('Describe the presentation you want to generate');
        if (!prompt) return;

        try {
            setGenerating(true);
            setError('');

            const aiPrompt = [
                'Generate a presentation outline as JSON only.',
                'Return an object with keys "title" and "slides".',
                'Each slide must have "title" and "content".',
                'Do not wrap the JSON in markdown fences.',
                `User request: ${prompt}`,
            ].join(' ');

            const rawResponse = await aiService.chat(aiPrompt, '');
            const cleanedResponse = rawResponse.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanedResponse) as {
                title?: string;
                slides?: Array<{ title?: string; content?: string }>;
            };

            const presentationTitle = parsed.title?.trim() || prompt.slice(0, 60) || 'AI Generated Presentation';
            const slides = Array.isArray(parsed.slides) ? parsed.slides : [];

            const newPresentation = await createPresentation(presentationTitle, projectId);

            for (const slide of slides) {
                await createPresentationSlide(
                    slide.title?.trim() || 'Untitled Slide',
                    newPresentation.id,
                    slide.content?.trim() || ''
                );
            }

            router.push(`/projects/${projectId}/presentations/${newPresentation.id}`);
        } catch (err) {
            console.error('Failed to generate presentation:', err);
            setError('Failed to generate presentation');
        } finally {
            setGenerating(false);
        }
    };

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
                                Manage presentations for {projectName}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleGeneratePresentation} disabled={generating} variant="outline" className="shrink-0">
                                {generating ? 'Generating...' : 'Generate with AI'}
                            </Button>
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
                </div>

                {/* Filters/Search (Placeholder) */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search presentations" className="pl-10" />
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
                                        {/* Placeholder for menu */}
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
