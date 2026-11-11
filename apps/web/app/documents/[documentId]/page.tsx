'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DocumentEditor } from '@/components/editor/document-editor'
import { getDocument, updateDocument, Document } from '@/lib/documents'

export default function DocumentPage() {
  const params = useParams()
  const documentId = params.documentId as string

  const [document, setDocument] = useState<Document | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDocument() {
      try {
        setIsLoading(true)
        setError(null)
        const doc = await getDocument(documentId)
        setDocument(doc)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setIsLoading(false)
      }
    }

    if (documentId) {
      fetchDocument()
    }
  }, [documentId])

  const handleSave = React.useCallback(async (title: string, content: string) => {
    await updateDocument(documentId, { title, content })
  }, [documentId])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
        </div>
      </div>
    )
  }

  return (
    <DocumentEditor
      documentId={documentId}
      projectId={document.project_id}
      initialTitle={document.title}
      initialContent={document.content || ''}
      onSave={handleSave}
    />
  )
}
