'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { EditorToolbar } from './toolbar'
import { AIPanel } from './ai-panel'
import { ChatPanel } from './chat-panel'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  getSocket,
  disconnectSocket,
  joinDocument,
  emitDocumentUpdate,
  onDocumentUpdate,
  onJoinedDocument,
  onUserJoinedDocument,
  onUserLeftDocument,
  OnlineUser
} from '@/lib/socket'

interface DocumentEditorProps {
  documentId?: string
  projectId?: string
  initialTitle?: string
  initialContent?: string
  onSave?: (title: string, content: string) => Promise<void>
}

export function DocumentEditor({
  documentId,
  projectId,
  initialTitle = 'Untitled Document',
  initialContent = '',
  onSave,
}: DocumentEditorProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(() => {
    // Sanitize any null characters from the initial load
    return (initialContent || '')
      .replace(/\0/g, '')
      .replace(/\\u0000/g, '')
  })
  const [isTitleFocused, setIsTitleFocused] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])

  // Panel State: 'ai' | 'chat' | 'none'
  const [activePanel, setActivePanel] = useState<'ai' | 'chat'>('ai')

  // Track if content has changed
  const hasChanges = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track last emitted content to avoid echoing own updates
  const lastEmittedContent = useRef<string>('')
  const emitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================================================
  // Real-time Socket Integration
  // ============================================================================

  useEffect(() => {
    if (!documentId) return

    // Connect and join document room
    const socket = getSocket()
    let cleanupListeners = () => { }

    if (socket) {
      const handleConnect = () => {
        joinDocument(documentId)
      }

      const handleError = (err: any) => {
        console.error('[Socket] Error:', err)
      }

      socket.on('connect', handleConnect)
      socket.on('error', handleError)

      cleanupListeners = () => {
        socket.off('connect', handleConnect)
        socket.off('error', handleError)
      }

      // Join immediately if already connected
      if (socket.connected) {
        handleConnect()
      }
    }

    // Listen for updates from other clients
    const cleanupUpdates = onDocumentUpdate((data) => {
      // Avoid applying our own updates
      if (data.content !== lastEmittedContent.current) {
        // Fix: Sanitize content that may be double-escaped during transmission
        let cleanContent = data.content
        if (typeof cleanContent === 'string') {
          cleanContent = cleanContent
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\0/g, '')
            .replace(/\\u0000/g, '')
        }
        setContent(cleanContent)
      }
    })

    // Listen for presence events
    const cleanupJoined = onJoinedDocument((data) => {
      setOnlineUsers(data.onlineUsers)
    })

    const cleanupUserJoined = onUserJoinedDocument((user) => {
      setOnlineUsers(prev => {
        if (prev.find(u => u.userId === user.userId)) return prev
        return [...prev, user]
      })
    })

    const cleanupUserLeft = onUserLeftDocument((data) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId))
    })

    return () => {
      cleanupListeners()
      cleanupUpdates()
      cleanupJoined()
      cleanupUserJoined()
      cleanupUserLeft()
      if (emitTimeoutRef.current) {
        clearTimeout(emitTimeoutRef.current)
      }
      disconnectSocket()
    }
  }, [documentId])

  // ============================================================================
  // Debounced Save Function (REST API)
  // ============================================================================

  const debouncedSave = useCallback(async () => {
    if (!onSave || !hasChanges.current) return

    setIsSaving(true)
    setSaveError(null)

    try {
      await onSave(title, content)
      hasChanges.current = false
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [onSave, title, content])

  // Auto-save on changes (debounced 1 second)
  useEffect(() => {
    if (!onSave) return

    hasChanges.current = true

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave()
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [title, content, debouncedSave, onSave])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value)
    },
    []
  )

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value
      setContent(newContent)

      // Debounce socket emit (300ms)
      if (documentId) {
        if (emitTimeoutRef.current) {
          clearTimeout(emitTimeoutRef.current)
        }
        emitTimeoutRef.current = setTimeout(() => {
          lastEmittedContent.current = newContent
          emitDocumentUpdate(documentId, newContent)
        }, 300)
      }
    },
    [documentId]
  )


  return (
    <div className="flex flex-col h-full bg-background">
      <EditorToolbar
        onBack={() => router.push('/')}
        onlineUsers={onlineUsers}
        documentTitle={title}
        currentUserId={user?.id}
        activePanel={activePanel}
        onTogglePanel={(panel) => setActivePanel(panel)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title */}
          <div className="px-8 pt-8 pb-4 border-b border-border/50">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={() => setIsTitleFocused(false)}
              className="w-full bg-transparent text-4xl font-bold outline-none transition-colors"
              placeholder="Enter document title"
            />
            <div className="flex items-center gap-2 mt-2">
              <p className="text-sm text-muted-foreground">
                Start typing or paste content below
              </p>
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

          {/* Editor Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder="Begin writing your document content"
              className="flex-1 px-8 py-6 bg-transparent text-base leading-relaxed resize-none outline-none overflow-y-auto"
              style={{
                fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
              }}
            />
          </div>
        </div>

        {/* Right Panel - AI Assistant or Chat */}
        {activePanel === 'ai' ? (
          <AIPanel
            documentContent={content}
            onUpdateContent={(newContent) => {
              setContent(newContent)
              // Trigger socket emit
              if (documentId) {
                lastEmittedContent.current = newContent
                emitDocumentUpdate(documentId, newContent)

                if (emitTimeoutRef.current) clearTimeout(emitTimeoutRef.current)
                emitDocumentUpdate(documentId, newContent)
              }
            }}
          />
        ) : projectId ? (
          <ChatPanel projectId={projectId} />
        ) : (
          <div className="w-80 border-l border-border bg-muted/20 flex items-center justify-center p-4 text-center">
            <p className="text-sm text-muted-foreground">Chat unavailable (No Project ID)</p>
          </div>
        )}
      </div>
    </div>
  )
}
