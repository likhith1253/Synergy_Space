'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  Star,
  FileText,
  Clock,
  Share2,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { getAllDocuments } from '@/lib/documents'
import { ApiClient } from '@/lib/api-client'

export default function DocumentsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [documents, setDocuments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchDocuments() {
      try {
        setLoading(true)
        const data = await getAllDocuments()
        setDocuments(data.map(doc => ({
          ...doc,
          lastEdited: new Date(doc.updated_at).toLocaleDateString(),
          lastEditor: 'Unknown',
          collaborators: [],
          status: 'Active',
          color: 'from-foreground to-foreground/80' // Default color
        })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [])

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold mb-2">Documents</h1>
        <p className="text-muted-foreground">
          Browse and manage all documents across your projects.
        </p>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row items-center gap-4"
      >
        {/* Search */}
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled
            title="Filtering is not available yet"
            className="opacity-50 cursor-not-allowed"
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              alert('To create a document, go to a project first.')
              router.push('/projects')
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </div>
      </motion.div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredDocs.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Link href={`/documents/${doc.id}`}>
                <Card className="bg-card border-border hover:border-accent/50 overflow-hidden group cursor-pointer transition-all h-full">
                  {/* Color Header */}
                  <div
                    className={`h-20 bg-gradient-to-r ${doc.color} opacity-80`}
                  />

                  <CardContent className="p-6 space-y-4">
                    {/* Title & Star */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-accent transition-colors line-clamp-2">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.project}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="mt-1"
                        onClick={(e) => e.preventDefault()}
                      >
                        {doc.starred ? (
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Star className="w-5 h-5 text-muted-foreground hover:text-yellow-400" />
                        )}
                      </motion.button>
                    </div>

                    {/* Status & Time */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-secondary/80"
                      >
                        {doc.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {doc.lastEdited}
                      </span>
                    </div>

                    {/* Editor & Collaborators */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Edited by <span className="font-medium">{doc.lastEditor}</span>
                      </p>
                      <div className="flex items-center gap-1">
                        {doc.collaborators.slice(0, 3).map((avatar: any) => (
                          <Avatar key={avatar} className="w-6 h-6">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                              {avatar}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {doc.collaborators.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{doc.collaborators.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          {filteredDocs.map((doc, index) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{ x: 4 }}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-accent/50 hover:bg-secondary/50 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-4 flex-1">
                  <FileText className="w-5 h-5 text-muted-foreground group-hover:text-accent" />
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-accent transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{doc.project}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden md:flex items-center gap-2">
                    {doc.collaborators.slice(0, 3).map((avatar: any) => (
                      <Avatar key={avatar} className="w-6 h-6">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {avatar}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>

                  <Badge variant="secondary" className="text-xs">
                    {doc.status}
                  </Badge>

                  <span className="text-sm text-muted-foreground w-24 text-right">
                    {doc.lastEdited}
                  </span>

                  <motion.button
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </motion.button>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {filteredDocs.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center py-16"
        >
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No documents found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or create a new document
          </p>
        </motion.div>
      )}
    </div>
  )
}
