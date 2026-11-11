'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Plus,
  Users,
  Calendar,
  FileText,
  ArrowRight,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getProjects } from '@/lib/projects'

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

export default function ProjectsPage() {
  const [projects, setProjects] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        const data = await getProjects()
        setProjects(data)
      } catch (err) {
        setError('Failed to load projects')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  }

  if (error) {
    return <div className="p-8 text-destructive">Error: {error}</div>
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold mb-2">Projects</h1>
          <p className="text-muted-foreground">
            Manage all your projects and collaborate with your team.
          </p>
        </div>
        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </motion.div>

      {/* Projects Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {projects.map((project) => (
          <motion.div key={project.id} variants={itemVariants}>
            <Card className="bg-card border-border hover:border-accent/50 transition-all overflow-hidden group cursor-pointer h-full">
              {/* Gradient Header */}
              <div
                className={`h-24 bg-secondary bg-grid`}
              />

              <CardHeader className="-mt-12 mb-4 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-1">
                      {project.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </motion.div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold">0</span>{' '}
                      <span className="text-muted-foreground">docs</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold">
                        {project.members?.length || 0}
                      </span>{' '}
                      <span className="text-muted-foreground">members</span>
                    </span>
                  </div>
                </div>

                {/* Team Avatars */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex -space-x-2">
                    {project.members?.slice(0, 5).map((member: any, i: number) => (
                      <Avatar key={i} className="w-8 h-8 border-2 border-background">
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {member.name ? member.name.charAt(0) : '?'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* CTA */}
                <motion.div
                  whileHover={{ x: 4 }}
                  className="pt-2 group/cta"
                >
                  <Link href={`/projects/${project.id}/documents`} className="text-sm font-medium text-accent group-hover/cta:text-accent/80 transition-colors flex items-center gap-1">
                    View Details
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
