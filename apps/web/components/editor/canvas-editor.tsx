'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import * as fabric from 'fabric'
import {
  getSocket,
  disconnectSocket,
  joinDocument,
  emitCanvasUpdate,
  onCanvasUpdate,
} from '@/lib/socket'

interface CanvasEditorProps {
  documentId?: string
  initialCanvasData?: string
  onSave?: (canvasData: string) => Promise<void>
}

export function CanvasEditor({
  documentId,
  initialCanvasData,
  onSave,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const [selectedTool, setSelectedTool] = useState<string>('select')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Track last emitted data to avoid echoing own updates
  const lastEmittedData = useRef<string>('')
  const emitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasChanges = useRef(false)

  // ============================================================================
  // Initialize Fabric.js Canvas
  // ============================================================================
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth - 320, // Account for sidebar
      height: window.innerHeight - 200, // Account for toolbar and padding
      backgroundColor: '#ffffff',
      selection: true,
    })

    fabricCanvasRef.current = canvas

    // Load initial canvas data if provided
    if (initialCanvasData) {
      try {
        canvas.loadFromJSON(initialCanvasData, () => {
          canvas.renderAll()
        })
      } catch (error) {
        console.error('Failed to load initial canvas data:', error)
      }
    }

    // Handle window resize
    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth - 320,
        height: window.innerHeight - 200,
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.dispose()
    }
  }, [initialCanvasData])

  // ============================================================================
  // Real-time Socket Integration
  // ============================================================================
  useEffect(() => {
    if (!documentId || !fabricCanvasRef.current) return

    const socket = getSocket()
    let cleanupListeners = () => {}

    if (socket) {
      const handleConnect = () => {
        joinDocument(documentId)
      }

      const handleError = (err: Error) => {
        console.error('[Socket] Error:', err)
      }

      socket.on('connect', handleConnect)
      socket.on('error', handleError)

      cleanupListeners = () => {
        socket.off('connect', handleConnect)
        socket.off('error', handleError)
      }

      if (socket.connected) {
        handleConnect()
      }
    }

    // Listen for canvas updates from other clients
    const cleanupUpdates = onCanvasUpdate((data) => {
      if (!fabricCanvasRef.current || data.canvasData === lastEmittedData.current) return

      try {
        fabricCanvasRef.current.loadFromJSON(data.canvasData, () => {
          fabricCanvasRef.current?.renderAll()
        })
      } catch (error) {
        console.error('Failed to load canvas data from socket:', error)
      }
    })

    return () => {
      cleanupListeners()
      cleanupUpdates()
      if (emitTimeoutRef.current) {
        clearTimeout(emitTimeoutRef.current)
      }
      disconnectSocket()
    }
  }, [documentId])

  // ============================================================================
  // Debounced Save Function
  // ============================================================================
  const debouncedSave = useCallback(async () => {
    if (!onSave || !fabricCanvasRef.current || !hasChanges.current) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const canvasData = JSON.stringify(fabricCanvasRef.current.toJSON())
      await onSave(canvasData)
      hasChanges.current = false
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [onSave])

  // ============================================================================
  // Canvas Event Handlers for Real-time Sync
  // ============================================================================
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const handleCanvasModified = () => {
      if (!documentId) return

      hasChanges.current = true

      // Debounce socket emit
      if (emitTimeoutRef.current) {
        clearTimeout(emitTimeoutRef.current)
      }

      emitTimeoutRef.current = setTimeout(() => {
        const canvasData = JSON.stringify(canvas.toJSON())
        lastEmittedData.current = canvasData
        emitCanvasUpdate(documentId, canvasData)
      }, 300)

      // Trigger auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave()
      }, 1000)
    }

    canvas.on('object:added', handleCanvasModified)
    canvas.on('object:modified', handleCanvasModified)
    canvas.on('object:removed', handleCanvasModified)

    return () => {
      canvas.off('object:added', handleCanvasModified)
      canvas.off('object:modified', handleCanvasModified)
      canvas.off('object:removed', handleCanvasModified)
    }
  }, [documentId, debouncedSave])

  // ============================================================================
  // Tool Functions
  // ============================================================================
  const addRectangle = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 100,
      height: 60,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
    })

    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.renderAll()
  }, [])

  const addCircle = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const circle = new fabric.Circle({
      left: 150,
      top: 150,
      radius: 40,
      fill: '#10b981',
      stroke: '#047857',
      strokeWidth: 2,
    })

    canvas.add(circle)
    canvas.setActiveObject(circle)
    canvas.renderAll()
  }, [])

  const addText = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const text = new fabric.IText('Type here...', {
      left: 200,
      top: 200,
      fontSize: 20,
      fill: '#000000',
      fontFamily: 'Arial',
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    canvas.renderAll()
    text.enterEditing()
  }, [])

  const enableDrawing = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !canvas.freeDrawingBrush) return

    canvas.isDrawingMode = true
    canvas.freeDrawingBrush.width = 2
    canvas.freeDrawingBrush.color = '#000000'
  }, [])

  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const activeObject = canvas.getActiveObject()
    if (activeObject) {
      canvas.remove(activeObject)
      canvas.renderAll()
    }
  }, [])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !e.target.files?.[0]) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const fabricImg = new fabric.Image(img, {
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5,
        })
        canvas.add(fabricImg)
        canvas.setActiveObject(fabricImg)
        canvas.renderAll()
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(e.target.files[0])
  }, [])

  // Handle tool selection
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    // Disable drawing mode when switching tools
    if (selectedTool !== 'draw') {
      canvas.isDrawingMode = false
    }

    // Set selection mode based on tool
    canvas.selection = selectedTool === 'select'
  }, [selectedTool])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b border-border/50 bg-card">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedTool('select')}
            className={`p-2 rounded transition-colors ${
              selectedTool === 'select' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted'
            }`}
            title="Select"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2z" />
            </svg>
          </button>

          <button
            onClick={() => {
              setSelectedTool('draw')
              enableDrawing()
            }}
            className={`p-2 rounded transition-colors ${
              selectedTool === 'draw' 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted'
            }`}
            title="Draw"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>

          <button
            onClick={() => {
              setSelectedTool('text')
              addText()
            }}
            className={`p-2 rounded transition-colors hover:bg-muted`}
            title="Add Text"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={() => {
              setSelectedTool('rectangle')
              addRectangle()
            }}
            className={`p-2 rounded transition-colors hover:bg-muted`}
            title="Add Rectangle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" strokeWidth={2} />
            </svg>
          </button>

          <button
            onClick={() => {
              setSelectedTool('circle')
              addCircle()
            }}
            className={`p-2 rounded transition-colors hover:bg-muted`}
            title="Add Circle"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" strokeWidth={2} />
            </svg>
          </button>

          <label className="p-2 rounded transition-colors hover:bg-muted cursor-pointer" title="Upload Image">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={deleteSelected}
            className="p-2 rounded transition-colors hover:bg-muted text-destructive"
            title="Delete Selected"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-sm text-muted-foreground animate-pulse">
              Saving...
            </span>
          )}
          {saveError && (
            <span className="text-sm text-destructive">
              {saveError}
            </span>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-hidden bg-muted/20 p-4">
        <div className="w-full h-full bg-white rounded-lg shadow-sm overflow-hidden">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  )
}
