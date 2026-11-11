'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight,
  Folder,
  Plus,
  Clock,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getProjects, createProject, Project } from '@/lib/projects'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export function DashboardContent() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New project state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      setError('Unable to load projects. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!newProjectName.trim()) return

    try {
      setIsCreating(true)
      const newProject = await createProject(newProjectName)
      setError(null)
      setProjects((prev) => [newProject, ...prev])
      setNewProjectName('')
      setIsDialogOpen(false)
      // Navigate to the new project
      setNewProjectName('')
      setIsDialogOpen(false)

      // Navigate to the new project only if we have a valid ID
      if (newProject.id) {
        window.location.href = `/projects/${newProject.id}`
      } else {
        // Fallback: refresh the list if ID is missing (should not happen)
        fetchProjects()
      }
    } catch (err) {
      console.error('Failed to create project:', err)
      setError('Unable to create project. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 sm:px-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-eyebrow mb-3">Workspace</p>
          <h1 className="font-serif text-5xl leading-none tracking-tight">Good to see you.</h1>
          <p className="mt-3 text-muted-foreground">
            Pick up a project, or start something new.
          </p>
        </motion.div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-full px-5">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your documents.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Q4 Marketing"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating || !newProjectName.trim()}>
                  {isCreating ? 'Creating...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-eyebrow">Your projects · {projects.length}</h2>
          <Button variant="ghost" size="sm" onClick={fetchProjects} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p>{error}</p>
            <Button variant="link" onClick={fetchProjects}>Try Again</Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card py-20 text-center">
            <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">Create your first project to get started</p>
            <Button onClick={() => setIsDialogOpen(true)}>Create Project</Button>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {projects.map((project) => (
              <motion.div
                key={project.id}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                className="group"
              >
                <Link href={`/projects/${project.id}/documents`}>
                  <Card className="h-full cursor-pointer rounded-2xl shadow-none transition-all duration-300 hover:shadow-lift">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-medium tracking-tight">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {project.description || 'No description'}
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </CardHeader>
                    <CardContent>
                      <div className="mt-4 flex items-center gap-4 font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}
