
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import { CanvasItem, ShapeType } from '@/types/canvas';
import Konva from 'konva';

// URLImage component for handling images with useImage hook
const URLImage = ({ item, isSelected, onSelect, onChange }: any) => {
    const [image] = useImage(item.src);
    const imageRef = useRef<any>(null);

    return (
        <>
            <KonvaImage
                key={item.id}
                image={image}
                x={item.x}
                y={item.y}
                width={item.width}
                height={item.height}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                ref={imageRef}
                onDragEnd={(e: any) => {
                    onChange({
                        ...item,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={(e: any) => {
                    const node = imageRef.current;
                    if (!node) return;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    const newAttrs = {
                        ...item,
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(5, node.width() * scaleX),
                        height: Math.max(5, node.height() * scaleY),
                    }

                    node.scaleX(1);
                    node.scaleY(1);
                    onChange(newAttrs);
                }}
            />
        </>
    );
};

interface CanvasBoardProps {
    items: CanvasItem[];
    setItems: React.Dispatch<React.SetStateAction<CanvasItem[]>>;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    tool: ShapeType | 'select' | 'eraser';
    isDrawing: boolean;
    setIsDrawing: (isDrawing: boolean) => void;
    strokeColor: string;
    strokeWidth: number;
    eraserWidth: number;
}

// ... URLImage and ShapeWrapper components remain the same ...

const CanvasBoard: React.FC<CanvasBoardProps> = ({
    items,
    setItems,
    selectedId,
    onSelect,
    tool,
    isDrawing,
    setIsDrawing,
    strokeColor,
    strokeWidth,
    eraserWidth,
}) => {
    const stageRef = useRef<Konva.Stage>(null);
    const [newAnnotation, setNewAnnotation] = useState<any[]>([]); // For pencil drawing

    const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        // Deselect when clicked on empty area
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            onSelect(null);
        }
    };

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (tool === 'pencil' || tool === 'eraser') {
            setIsDrawing(true);
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                setNewAnnotation([pos.x, pos.y]);
            }
            return;
        }
        checkDeselect(e);
    };

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if ((tool !== 'pencil' && tool !== 'eraser') || !isDrawing) return;
        const stage = e.target.getStage();
        const point = stage?.getPointerPosition();
        if (point) {
            setNewAnnotation((prev) => prev.concat([point.x, point.y]));
        }
    };

    const handleMouseUp = () => {
        if ((tool === 'pencil' || tool === 'eraser') && isDrawing) {
            setIsDrawing(false);
            if (newAnnotation.length > 0) {
                const newLine: CanvasItem = {
                    id: crypto.randomUUID(),
                    type: 'pencil',
                    points: newAnnotation,
                    x: 0,
                    y: 0,
                    stroke: tool === 'eraser' ? 'rgba(0,0,0,1)' : strokeColor,
                    strokeWidth: tool === 'eraser' ? eraserWidth : strokeWidth,
                    tension: 0.5,
                    opacity: 1,
                    // Store eraser flag in the item
                    ...(tool === 'eraser' ? { isEraser: true } : {}),
                };
                setItems((prev) => [...prev, newLine]);
                setNewAnnotation([]);
            }
        }
    };

    const updateItem = (id: string, newAttrs: any) => {
        setItems((prev) => prev.map(item => item.id === id ? newAttrs : item));
    }

    return (
        <Stage
            width={window.innerWidth}
            height={window.innerHeight}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            ref={stageRef}
            className="bg-background bg-grid" // Tailwind grid pattern can be added via CSS
        >
            <Layer>
                {items.map((item, i) => {
                    if (item.type === 'image') {
                        return (
                            <URLImage
                                key={item.id}
                                item={item}
                                isSelected={item.id === selectedId}
                                onSelect={() => onSelect(item.id)}
                                onChange={(newAttrs: any) => updateItem(item.id, newAttrs)}
                            />
                        )
                    }
                    if (item.type === 'rect') {
                        return (
                            <ShapeWrapper
                                key={item.id}
                                item={item}
                                isSelected={item.id === selectedId}
                                onSelect={() => onSelect(item.id)}
                                onChange={(newAttrs: any) => updateItem(item.id, newAttrs)}
                                Component={Rect}
                            />
                        )
                    }
                    if (item.type === 'circle') {
                        return (
                            <ShapeWrapper
                                key={item.id}
                                item={item}
                                isSelected={item.id === selectedId}
                                onSelect={() => onSelect(item.id)}
                                onChange={(newAttrs: any) => updateItem(item.id, newAttrs)}
                                Component={Circle}
                            />
                        )
                    }
                    if (item.type === 'text') {
                        return (
                            <ShapeWrapper
                                key={item.id}
                                item={item}
                                isSelected={item.id === selectedId}
                                onSelect={() => onSelect(item.id)}
                                onChange={(newAttrs: any) => updateItem(item.id, newAttrs)}
                                Component={Text}
                            />
                        )
                    }
                    if (item.type === 'pencil') {
                        return (
                            <Line
                                key={item.id}
                                points={(item as any).points}
                                stroke={item.stroke}
                                strokeWidth={item.strokeWidth}
                                tension={0.5}
                                lineCap="round"
                                lineJoin="round"
                                globalCompositeOperation={
                                    (item as any).isEraser ? 'destination-out' : 'source-over'
                                }
                            />
                        )
                    }
                    return null;
                })}

                {/* Drawing line preview */}
                {newAnnotation.length > 0 && (
                    <Line
                        points={newAnnotation}
                        stroke={tool === 'eraser' ? 'rgba(0,0,0,1)' : strokeColor}
                        strokeWidth={tool === 'eraser' ? eraserWidth : strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                        globalCompositeOperation={tool === 'eraser' ? 'destination-out' : 'source-over'}
                    />
                )}
            </Layer>
        </Stage>
    );
};

const ShapeWrapper = ({ item, isSelected, onSelect, onChange, Component }: any) => {
    const shapeRef = useRef<any>(null);
    const trRef = useRef<Konva.Transformer>(null);

    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected]);

    return (
        <>
            <Component
                onClick={onSelect}
                onTap={onSelect}
                ref={shapeRef}
                {...item}
                draggable
                onDragEnd={(e: any) => {
                    onChange({
                        ...item,
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={(e: any) => {
                    const node = shapeRef.current;
                    if (!node) return;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    //   node.scaleX(1);
                    //   node.scaleY(1);

                    const newAttrs = {
                        ...item,
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                    }

                    if (item.type === 'text') {
                        // For text, we might want to scale font size? Or just width?
                        // Usually for text transformer we just change scale
                        newAttrs.scaleX = scaleX;
                        newAttrs.scaleY = scaleY;
                    } else if (item.type === 'circle') {
                        // For circle, radius * scale
                        newAttrs.scaleX = scaleX;
                        newAttrs.scaleY = scaleY;
                    } else {
                        // For rect, width * scale
                        newAttrs.width = Math.max(5, node.width() * scaleX);
                        newAttrs.height = Math.max(5, node.height() * scaleY);
                        // reset scale for rects to keep stroke consistent if we wanted, 
                        // but simpler to just keep scale for now or update width/height and reset scale
                        node.scaleX(1);
                        node.scaleY(1);
                    }

                    onChange(newAttrs);
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );
};

export default CanvasBoard;
