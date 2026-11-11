'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Presentation, Plus, Search, Calendar, MoreVertical, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPresentationSlides, createPresentationSlide, type Slide } from '@/lib/slides';
import { getPresentation, type Presentation as PresentationType } from '@/lib/presentations';
import { ApiClient } from '@/lib/api-client';

export default function PresentationSlidesPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const presentationId = params.presentationId as string;

    const [slides, setSlides] = useState<Slide[]>([]);
    const [presentation, setPresentation] = useState<PresentationType | null>(null);
    const [projectName, setProjectName] = useState('Project');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId || !presentationId) return;

            try {
                setLoading(true);
                
                // Fetch presentation details
                const presentationData = await getPresentation(presentationId);
                setPresentation(presentationData);

                // Fetch project name (we could get this from context, but fetching for reliability)
                const projectData = await ApiClient.get<{ name: string }>(`/projects/${projectId}`).catch(() => ({ name: 'Project' }));
                setProjectName(projectData.name || 'Project');

                const fetchedSlides = await getPresentationSlides(presentationId);
                setSlides(fetchedSlides);
            } catch (err) {
                console.error('Failed to load presentation data:', err);
                setError('Failed to load presentation slides');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId, presentationId]);

    const handleCreateSlide = async () => {
        try {
            setCreating(true);
            const newSlide = await createPresentationSlide('Untitled Slide', presentationId);
            router.push(`/slides/${newSlide.id}?presentationId=${presentationId}&projectId=${projectId}`);
        } catch (err) {
            console.error('Failed to create slide:', err);
            setError('Failed to create slide');
        } finally {
            setCreating(false);
        }
    };

    const handleDownloadPresentation = async () => {
        try {
            setExporting(true);
            const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${presentation?.title || 'Presentation'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; }
    .slide { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; margin: 0 auto 24px; max-width: 960px; min-height: 540px; box-shadow: 0 10px 30px rgba(15,23,42,.08); }
    h1 { margin-top: 0; }
    pre { white-space: pre-wrap; font-family: inherit; }
  </style>
</head>
<body>
  ${slides.map((slide, index) => `<section class="slide"><h1>${slide.title || `Slide ${index + 1}`}</h1><pre>${slide.content || ''}</pre></section>`).join('')}
</body>
</html>`;

            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${(presentation?.title || 'presentation').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.html`;
            anchor.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
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
                        <Link href={`/projects/${projectId}/presentations`} className="hover:text-foreground transition-colors">
                            Presentations
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">{presentation?.title || 'Untitled'}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{presentation?.title || 'Untitled Presentation'}</h1>
                            <p className="text-muted-foreground mt-1">
                                Slides for this presentation
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleDownloadPresentation} disabled={exporting}>
                                {exporting ? 'Exporting...' : 'Download HTML'}
                            </Button>
                            <Button variant="outline" size="sm">
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </Button>
                            <Button onClick={handleCreateSlide} disabled={creating} className="shrink-0">
                                {creating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        New Slide
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
                        <Input placeholder="Search slides" className="pl-10" />
                    </div>
                </div>

                {/* Slides Grid */}
                {error ? (
                    <div className="text-center py-12 text-destructive">
                        <p>{error}</p>
                    </div>
                ) : slides.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg">
                        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Presentation className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No slides yet</h3>
                        <p className="text-muted-foreground mb-6">Create your first slide to start presenting</p>
                        <Button onClick={handleCreateSlide} disabled={creating} variant="outline">
                            Create Slide
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {slides.map((slide) => (
                            <Link href={`/slides/${slide.id}?presentationId=${presentationId}&projectId=${projectId}`} key={slide.id} className="block group">
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
                                        {slide.title || 'Untitled'}
                                    </h3>
                                    <div className="w-full aspect-video bg-muted/30 rounded mt-2 mb-2 p-2 relative overflow-hidden text-xs text-muted-foreground">
                                        {/* Minimal preview of content */}
                                        {slide.content?.substring(0, 100) || "Empty slide"}
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground mt-auto pt-2">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        <span>Updated {new Date(slide.updated_at).toLocaleDateString()}</span>
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
