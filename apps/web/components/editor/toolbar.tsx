'use client'

import React, { useState, useEffect } from 'react'
import { Check, Cloud, AlertCircle, Users, Copy, ArrowLeft, MessageSquare, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { OnlineUser } from '@/lib/socket'

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

interface EditorToolbarProps {
  onBack?: () => void;
  onlineUsers?: OnlineUser[];
  documentTitle?: string;
  currentUserId?: string;
  activePanel?: 'ai' | 'chat';
  onTogglePanel?: (panel: 'ai' | 'chat') => void;
}

export function EditorToolbar({
  onBack,
  onlineUsers = [],
  documentTitle = 'Document',
  currentUserId,
  activePanel = 'ai',
  onTogglePanel
}: EditorToolbarProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Simulate save status changes (Todo: Connect to actual save state)
  const handleSave = () => {
    setSaveStatus('saving')
    setTimeout(() => {
      setSaveStatus('saved')
      setLastSaved(new Date())
    }, 500)
  }

  const handleShare = () => {
    const subject = encodeURIComponent(`Collaboration Invite: ${documentTitle}`);
    const body = encodeURIComponent(`I'm inviting you to collaborate on this document.\n\nOpen here: ${window.location.href}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Handle Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getSaveStatusLabel = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...'
      case 'saved':
        return lastSaved
          ? `Saved ${formatTime(lastSaved)}`
          : 'All changes saved'
      case 'unsaved':
        return 'Unsaved changes'
      case 'error':
        return 'Save failed'
      default:
        return 'All changes saved'
    }
  }

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Cloud className="w-4 h-4 animate-pulse" />
      case 'saved':
        return <Check className="w-4 h-4 text-success" />
      case 'unsaved':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />
      default:
        return <Check className="w-4 h-4 text-success" />
    }
  }

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Back & Save Status */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to Dashboard">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            {getSaveStatusIcon()}
            <span className="text-sm text-muted-foreground">
              {getSaveStatusLabel()}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Collaborators Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <Users className="w-4 h-4" />
                <span className="text-xs">{onlineUsers.length} collaborator{onlineUsers.length !== 1 ? 's' : ''}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60" align="end">
              <div className="space-y-2">
                <h4 className="font-medium leading-none mb-2">Active Users</h4>
                <ScrollArea className="h-[200px]">
                  {onlineUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">No active users.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {onlineUsers.map((user) => {
                        const isMe = user.userId === currentUserId;
                        return (
                          <div
                            key={user.userId}
                            className={`flex items-center gap-2 text-sm p-2 rounded hover:bg-muted ${isMe ? 'border border-blue-500 bg-blue-50/10' : ''}`}
                          >
                            <div className="w-2 h-2 rounded-full bg-success" />
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-medium truncate">{user.name} {isMe && '(You)'}</span>
                              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={handleShare}
          >
            <Copy className="w-4 h-4" />
            Share
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Panel Toggles */}
          <div className="flex items-center bg-muted/50 rounded-lg p-1">
            <Button
              variant={activePanel === 'ai' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => onTogglePanel?.('ai')}
            >
              <Bot className="w-3.5 h-3.5" />
              AI
            </Button>
            <Button
              variant={activePanel === 'chat' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-3 text-xs gap-1.5"
              onClick={() => onTogglePanel?.('chat')}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins === 0) return 'just now'
  if (diffMins === 1) return '1m ago'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours === 1) return '1h ago'
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
