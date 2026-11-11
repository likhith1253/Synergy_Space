
'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CanvasItem } from '@/types/canvas';
import { CanvasToolbar } from './Toolbar';
import { canvasApi } from '@/lib/canvas';
import { joinDocument, emitCanvasUpdate, onCanvasUpdate } from '@/lib/socket';
import { toast } from 'sonner';
import Link from 'next/link';

// Load CanvasBoard dynamically to avoid SSR issues with Konva
const CanvasBoard = dynamic(() => import('./CanvasBoard'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full bg-background text-muted-foreground">Loading Canvas...</div>
});

interface CanvasEditorProps {
    canvasId: string;
    projectId?: string;
    onBack?: () => void;
}

const CanvasEditor = ({ canvasId, projectId, onBack }: CanvasEditorProps) => {
    const [items, setItems] = useState<CanvasItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<'select' | 'pencil' | 'eraser'>('select');
    const [isDrawing, setIsDrawing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [strokeWidth, setStrokeWidth] = useState(5);
    const [eraserWidth, setEraserWidth] = useState(20);
    const [history, setHistory] = useState<CanvasItem[][]>([]);
    const [future, setFuture] = useState<CanvasItem[][]>([]);

    // Ref to track if the current update comes from remote
    const isRemoteUpdate = useRef(false);
    const itemsRef = useRef<CanvasItem[]>([]);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    const setCanvasItems = React.useCallback((
        next: React.SetStateAction<CanvasItem[]>,
        options: { recordHistory?: boolean } = {}
    ) => {
        const { recordHistory = true } = options;

        setItems((current) => {
            const resolved = typeof next === 'function' ? (next as (value: CanvasItem[]) => CanvasItem[])(current) : next;

            if (recordHistory) {
                setHistory((prev) => [...prev, current]);
                setFuture([]);
            }

            return resolved;
        });
    }, []);

    // Load backend data
    useEffect(() => {
        const loadCanvas = async () => {
            try {
                const data = await canvasApi.getCanvas(canvasId);

                if (data.data && Array.isArray(data.data.items)) {
                    setItems(data.data.items);
                    setHistory([]);
                    setFuture([]);
                } else {
                    setItems([]);
                    setHistory([]);
                    setFuture([]);
                }
            } catch (error) {
                console.log('Canvas not found or failed to load, starting with blank canvas:', error);
                // Don't show error toast for missing canvas - just start with blank canvas
                setItems([]);
            } finally {
                setIsLoading(false);
            }
        };
        if (canvasId) {
            loadCanvas();
        } else {
            setIsLoading(false);
        }
    }, [canvasId]);

    // Socket connection
    useEffect(() => {
        if (!canvasId) return;

        // Join room specific to this canvas
        joinDocument(canvasId);

        // Listen for updates
        const unsubscribe = onCanvasUpdate((data) => {
            try {
                // Ensure update is for this canvas if event is global (though room should isolate)
                const remoteItems = JSON.parse(data.canvasData);
                if (Array.isArray(remoteItems)) {
                    isRemoteUpdate.current = true;
                    setCanvasItems(remoteItems, { recordHistory: false });
                }
            } catch (e) {
                console.error('Failed to parse remote canvas update', e);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [canvasId]);

    // Save / Sync Logic
    useEffect(() => {
        if (!canvasId || isLoading) return;

        // If this was a remote update, we don't need to emit or save
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }

        // Emit to socket immediately
        emitCanvasUpdate(canvasId, JSON.stringify(items));

        // Debounce save to DB
        const timeoutId = setTimeout(() => {
            canvasApi.updateCanvas(canvasId, { items }).catch(err => {
                console.error('Auto-save failed:', err);
            });
        }, 1000);

        return () => clearTimeout(timeoutId);
        }, [items, canvasId, isLoading]);

    const handleUndo = () => {
        const previous = history[history.length - 1];
        if (!previous) return;

        const currentItems = itemsRef.current;
        setHistory((prev) => prev.slice(0, -1));
        setFuture((prev) => [currentItems, ...prev]);
        setCanvasItems(previous, { recordHistory: false });
    };

    const handleRedo = () => {
        const nextItems = future[0];
        if (!nextItems) return;

        const currentItems = itemsRef.current;
        setFuture((prev) => prev.slice(1));
        setHistory((prev) => [...prev, currentItems]);
        setCanvasItems(nextItems, { recordHistory: false });
    };


    const handleAddShape = (type: 'rect' | 'circle' | 'text') => {
        const id = crypto.randomUUID();
        const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        let newItem: CanvasItem;

        const baseItem = {
            id,
            x: center.x,
            y: center.y,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            fill: 'transparent',
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            opacity: 1,
        }

        if (type === 'rect') {
            newItem = {
                ...baseItem,
                type: 'rect',
                width: 100,
                height: 100,
                cornerRadius: 0
            };
        } else if (type === 'circle') {
            newItem = {
                ...baseItem,
                type: 'circle',
                radius: 50,
            };
        } else { // text
            newItem = {
                ...baseItem,
                type: 'text',
                text: 'Double click to edit',
                fontSize: 20,
                fontFamily: 'Arial',
                fill: '#000000',
                width: 200
            };
        }

        setCanvasItems((prev) => [...prev, newItem]);
        setSelectedId(id);
        setActiveTool('select');
    };

    const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const id = crypto.randomUUID();
                const newItem: CanvasItem = {
                    id,
                    type: 'image',
                    x: window.innerWidth / 2 - 100,
                    y: window.innerHeight / 2 - 100,
                    src: reader.result as string,
                    width: 200,
                    height: 200,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                };
                setCanvasItems((prev) => [...prev, newItem]);
                setSelectedId(id);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!canvasId) return;
        try {
            await canvasApi.updateCanvas(canvasId, { items });
            toast.success('Canvas saved');
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Failed to save canvas');
        }
    };

    const handleClearAll = () => {
        setCanvasItems([]);
        toast.success('Canvas cleared');
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full bg-background text-muted-foreground">Loading...</div>;
    }

    return (
        <div className="relative w-full h-full bg-background overflow-hidden">
            {/* Top Navigation Bar */}
            <div className="absolute top-4 left-4 right-4 z-50 flex items-center gap-2">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <Button variant="outline" size="icon" onClick={onBack} title="Back to Canvases">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    {projectId && (
                        <Link href={`/projects/${projectId}/documents`}>
                            <Button variant="outline" size="sm" title="Go to Documents">
                                <FileText className="h-4 w-4 mr-2" />
                                Documents
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <CanvasToolbar
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                onAddShape={handleAddShape}
                onUploadImage={handleUploadImage}
                strokeColor={strokeColor}
                setStrokeColor={setStrokeColor}
                strokeWidth={strokeWidth}
                setStrokeWidth={setStrokeWidth}
                eraserWidth={eraserWidth}
                setEraserWidth={setEraserWidth}
                onSave={handleSave}
                onClearAll={handleClearAll}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={history.length > 0}
                canRedo={future.length > 0}
            />
            <CanvasBoard
                items={items}
                setItems={setCanvasItems}
                selectedId={selectedId}
                onSelect={setSelectedId}
                tool={activeTool}
                isDrawing={isDrawing}
                setIsDrawing={setIsDrawing}
                strokeColor={strokeColor}
                strokeWidth={strokeWidth}
                eraserWidth={eraserWidth}
            />
        </div>
    );
};

export default CanvasEditor;
