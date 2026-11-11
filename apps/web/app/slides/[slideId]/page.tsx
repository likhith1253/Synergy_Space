'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Share2, Presentation, LayoutTemplate, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getSlide, updateSlide, type Slide } from '@/lib/slides';
import { joinSlide, emitSlideUpdate, onSlideUpdate, disconnectSocket } from '@/lib/socket';

// --- Types for Structured Slide Content ---

type TemplateType = 'classic' | 'two-column' | 'section-header' | 'quote' | 'blank';

interface SlideContentData {
    template: TemplateType;
    backgroundColor: string;
    textValues: Record<string, string>;
}

// Default template structure
const DEFAULT_SLIDE_DATA: SlideContentData = {
    template: 'classic',
    backgroundColor: '#ffffff',
    textValues: {
        body: ''
    }
};

const BACKGROUND_COLORS = [
    { name: 'White', value: '#ffffff' },
    { name: 'Off White', value: '#f8fafc' },
    { name: 'Dark Gray', value: '#1e293b' },
    { name: 'Slate', value: '#334155' },
    { name: 'Navy', value: '#172554' },
    { name: 'Amber', value: '#fef3c7' },
    { name: 'Rose', value: '#ffe4e6' },
    { name: 'Teal', value: '#ccfbf1' },
];

const TEMPLATES = [
    { id: 'classic', name: 'Classic', description: 'Title and full-width content' },
    { id: 'two-column', name: 'Two Columns', description: 'Title and two side-by-side text areas' },
    { id: 'section-header', name: 'Section Header', description: 'Large centered title and subtitle' },
    { id: 'quote', name: 'Quote', description: 'Large emphasized quote and citation' },
    { id: 'blank', name: 'Blank', description: 'Freestyle full-space content' }
] as const;


export default function SlideEditorPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slideId = params.slideId as string;
    const presentationId = searchParams.get('presentationId');
    const projectId = searchParams.get('projectId');

    const [slide, setSlide] = useState<Slide | null>(null);
    const [title, setTitle] = useState('');
    const [slideData, setSlideData] = useState<SlideContentData>(DEFAULT_SLIDE_DATA);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isLocalUpdate = useRef(false);

    // Parse DB content to our structured JSON format
    const parseSlideContent = (rawContent: string | null | undefined): SlideContentData => {
        if (!rawContent) return { ...DEFAULT_SLIDE_DATA };

        try {
            const parsed = JSON.parse(rawContent);
            // Check if it's the expected structure, otherwise wrap it
            if (parsed && typeof parsed === 'object' && 'template' in parsed) {
                return {
                    template: parsed.template || 'classic',
                    backgroundColor: parsed.backgroundColor || '#ffffff',
                    textValues: parsed.textValues || {}
                };
            } else {
                return { ...DEFAULT_SLIDE_DATA, textValues: { body: rawContent } };
            }
        } catch (e) {
            // It's probably raw legacy text
            return { ...DEFAULT_SLIDE_DATA, textValues: { body: rawContent } };
        }
    };

    useEffect(() => {
        const init = async () => {
            if (!slideId) return;

            try {
                setLoading(true);
                const data = await getSlide(slideId);
                setSlide(data);
                setTitle(data.title || '');
                setSlideData(parseSlideContent(data.content));

                // Connect to socket and join room
                joinSlide(slideId);
            } catch (err) {
                console.error('Failed to load slide:', err);
                setError('Failed to load slide');
            } finally {
                setLoading(false);
            }
        };

        init();

        return () => {
            disconnectSocket();
        };
    }, [slideId]);

    // Listen for remote updates
    useEffect(() => {
        const cleanup = onSlideUpdate((data) => {
            console.log('Received remote update:', data);
            if (data.title !== undefined) setTitle(data.title);
            if (data.content !== undefined) {
                setSlideData(parseSlideContent(data.content));
            }
        });

        return cleanup;
    }, []);

    // Debounced Save
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const saveToBackend = useCallback((newTitle: string, newData: SlideContentData) => {
        setSaving(true);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const serializedContent = JSON.stringify(newData);
                await updateSlide(slideId, { title: newTitle, content: serializedContent });
                setSaving(false);
            } catch (err) {
                console.error('Failed to save slide:', err);
                setSaving(false);
            }
        }, 800);
    }, [slideId]);

    // Handle Title Change (External Input)
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        isLocalUpdate.current = true;
        emitSlideUpdate(slideId, newTitle, undefined);
        saveToBackend(newTitle, slideData);
    };

    // Handle Structural changes (Colors, Templates, Text fields)
    const updateSlideData = (updates: Partial<SlideContentData>) => {
        setSlideData(prev => {
            const next = { ...prev, ...updates };

            // Clean up textValues if template changes to avoid mismatched data
            if (updates.template && updates.template !== prev.template) {
                next.textValues = {};
            }

            const stringified = JSON.stringify(next);
            emitSlideUpdate(slideId, undefined, stringified);
            saveToBackend(title, next);
            return next;
        });
    };

    const handleTextValueChange = (key: string, value: string) => {
        setSlideData(prev => {
            const next = {
                ...prev,
                textValues: { ...prev.textValues, [key]: value }
            };
            const stringified = JSON.stringify(next);
            emitSlideUpdate(slideId, undefined, stringified);
            saveToBackend(title, next);
            return next;
        });
    };


    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !slide) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
                <h2 className="text-xl font-semibold text-destructive">{error || 'Slide not found'}</h2>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }

    const isDarkBg = slideData.backgroundColor === '#1e293b' || slideData.backgroundColor === '#334155' || slideData.backgroundColor === '#172554';
    const textClass = isDarkBg ? 'text-white placeholder:text-gray-400 border-white/20' : 'text-gray-900 placeholder:text-gray-400 border-gray-200';

    // Renders the correct slide layout based on selected template
    const renderSlideContent = () => {
        switch (slideData.template) {
            case 'classic':
                return (
                    <div className="flex-1 flex flex-col p-10 h-full">
                        <Textarea
                            value={slideData.textValues.body || ''}
                            onChange={(e) => handleTextValueChange('body', e.target.value)}
                            className={`flex-1 w-full resize-none border-none shadow-none focus-visible:ring-0 p-0 text-xl leading-relaxed custom-scrollbar bg-transparent ${textClass}`}
                            placeholder="Click to add text..."
                        />
                    </div>
                );
            case 'two-column':
                return (
                    <div className="flex-1 flex gap-8 p-10 h-full">
                        <Textarea
                            value={slideData.textValues.leftCol || ''}
                            onChange={(e) => handleTextValueChange('leftCol', e.target.value)}
                            className={`flex-1 w-full resize-none border-none shadow-none focus-visible:ring-0 p-0 text-lg leading-relaxed custom-scrollbar bg-transparent ${textClass}`}
                            placeholder="Left column text..."
                        />
                        <div className={`w-px ${isDarkBg ? 'bg-white/20' : 'bg-gray-200'} my-4`}></div>
                        <Textarea
                            value={slideData.textValues.rightCol || ''}
                            onChange={(e) => handleTextValueChange('rightCol', e.target.value)}
                            className={`flex-1 w-full resize-none border-none shadow-none focus-visible:ring-0 p-0 text-lg leading-relaxed custom-scrollbar bg-transparent ${textClass}`}
                            placeholder="Right column text..."
                        />
                    </div>
                );
            case 'section-header':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6 h-full">
                        <Input
                            value={slideData.textValues.subtitle || ''}
                            onChange={(e) => handleTextValueChange('subtitle', e.target.value)}
                            className={`text-2xl font-light border-none shadow-none focus-visible:ring-0 p-0 text-center bg-transparent ${textClass} opacity-80`}
                            placeholder="Add Subtitle..."
                        />
                    </div>
                );
            case 'quote':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-16 h-full gap-8">
                        <div className="relative w-full max-w-2xl">
                            <span className={`absolute -top-12 -left-8 text-8xl opacity-20 font-serif ${isDarkBg ? 'text-white' : 'text-gray-400'}`}>"</span>
                            <Textarea
                                value={slideData.textValues.quote || ''}
                                onChange={(e) => handleTextValueChange('quote', e.target.value)}
                                className={`w-full text-center text-3xl md:text-4xl italic font-serif leading-relaxed resize-none border-none shadow-none focus-visible:ring-0 p-0 bg-transparent ${textClass}`}
                                placeholder="Enter an inspiring quote..."
                                rows={3}
                            />
                            <span className={`absolute -bottom-8 -right-8 text-8xl opacity-20 font-serif leading-none ${isDarkBg ? 'text-white' : 'text-gray-400'}`}>"</span>
                        </div>
                        <Input
                            value={slideData.textValues.citation || ''}
                            onChange={(e) => handleTextValueChange('citation', e.target.value)}
                            className={`text-xl font-medium border-none shadow-none focus-visible:ring-0 p-0 text-center bg-transparent mt-4 ${textClass} opacity-75`}
                            placeholder="— Citation or Author"
                        />
                    </div>
                );
            case 'blank':
                return (
                    <div className="flex-1 p-8 h-full">
                        <Textarea
                            value={slideData.textValues.body || ''}
                            onChange={(e) => handleTextValueChange('body', e.target.value)}
                            className={`w-full h-full resize-none border-none shadow-none focus-visible:ring-0 p-0 text-lg leading-relaxed custom-scrollbar bg-transparent ${textClass}`}
                            placeholder="Type anything here..."
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Navbar */}
            <header className="border-b h-14 flex items-center justify-between px-4 lg:px-6 bg-card shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        href={presentationId && projectId ? `/projects/${projectId}/presentations/${presentationId}` : '/dashboard'}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">Slide Editor</span>
                        {saving ? (
                            <span className="text-xs text-muted-foreground mt-1 flex items-center">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground mt-1">Saved</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Background Color Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="hidden sm:flex gap-2">
                                <Palette className="w-4 h-4" />
                                Background
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="end">
                            <h4 className="text-sm font-medium mb-3">Slide Background</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {BACKGROUND_COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        title={color.name}
                                        onClick={() => updateSlideData({ backgroundColor: color.value })}
                                        className={`w-10 h-10 rounded-full border-2 transition-all ${slideData.backgroundColor === color.value ? 'border-primary scale-110 shadow-sm' : 'border-transparent hover:scale-105 shadow-sm'}`}
                                        style={{ backgroundColor: color.value, border: color.value === '#ffffff' && slideData.backgroundColor !== color.value ? '2px solid #e2e8f0' : undefined }}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Template Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                                <LayoutTemplate className="w-4 h-4" />
                                Templates
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-2" align="end">
                            <div className="space-y-1">
                                <h4 className="text-sm font-medium px-2 py-1.5 text-muted-foreground">Select Layout</h4>
                                {TEMPLATES.map(tpl => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => updateSlideData({ template: tpl.id as TemplateType })}
                                        className={`w-full text-left px-2 py-2 rounded-md transition-colors flex flex-col gap-0.5
                                            ${slideData.template === tpl.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                                    >
                                        <span className="font-medium text-sm">{tpl.name}</span>
                                        <span className="text-xs opacity-70">{tpl.description}</span>
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="w-px h-4 bg-border mx-1 hidden sm:block"></div>

                    <div className="px-3 py-1 bg-success/10 text-success text-xs rounded-full font-medium hidden md:flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-success mr-2 animate-pulse"></div>
                        Live Sync
                    </div>
                </div>
            </header>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-muted/20 p-4 lg:p-8">

                {/* Main Slide Canvas */}
                <main className="flex-1 flex items-center justify-center">
                    <div
                        className="w-full max-w-5xl aspect-video shadow-xl rounded-xl overflow-hidden flex flex-col border border-border/40 transition-colors duration-300"
                        style={{ backgroundColor: slideData.backgroundColor }}
                    >
                        {/* Slide Header (Title) - Hidden for Blank Template */}
                        {slideData.template !== 'blank' && (
                            <div className={`px-10 py-8 ${slideData.template === 'section-header' ? 'flex-1 flex flex-col justify-end pb-4 border-none' : ''}`}>
                                <Input
                                    value={title}
                                    onChange={handleTitleChange}
                                    className={`
                                        border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent
                                        ${slideData.template === 'section-header' ? 'text-5xl md:text-6xl text-center font-extrabold tracking-tight' : 'text-4xl font-bold tracking-tight'}
                                        ${textClass}
                                    `}
                                    placeholder={slideData.template === 'section-header' ? 'Section Title' : 'Click to add title'}
                                />
                                {slideData.template !== 'section-header' && (
                                    <div className={`h-1 w-16 mt-4 rounded-full ${isDarkBg ? 'bg-white/20' : 'bg-primary/20'}`}></div>
                                )}
                            </div>
                        )}

                        {/* Dynamic Slide Body based on template */}
                        {renderSlideContent()}

                    </div>
                </main>
            </div>
        </div>
    );
}
