'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  LayoutGrid,
  FolderOpen,
  FileText,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  Presentation,
  Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Logo } from '@/components/logo'

import { getProjects, Project } from '@/lib/projects'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ApiClient } from '@/lib/api-client'
import { joinOrganization, onUserOnline, onUserOffline, onJoinedOrganization } from '@/lib/socket'
import { HelpModal } from '@/components/help-modal'

interface Member {
  id: string
  name: string
  avatar: string
  email: string
}

interface ApiMember {
  user: {
    id: string
    full_name?: string
    email: string
  }
}

interface Document {
  id: string
  [key: string]: unknown
}

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [activeOrg, setActiveOrg] = React.useState('')
  const [showOrgMenu, setShowOrgMenu] = React.useState(false)
  const [projects, setProjects] = React.useState<Project[]>([])
  const [members, setMembers] = React.useState<Member[]>([])
  const [onlineUsers, setOnlineUsers] = React.useState<Set<string>>(new Set())
  const [docCount, setDocCount] = React.useState<number | null>(null)
  const [showHelpModal, setShowHelpModal] = React.useState(false)

  React.useEffect(() => {
    if (user?.organization?.name) {
      setActiveOrg(user.organization.name)
    }
  }, [user?.organization?.name])

  React.useEffect(() => {
    async function loadProjects() {
      try {
        const data = await getProjects()
        setProjects(data)
      } catch (err) {
        console.error('Failed to load sidebar projects:', err)
      }
    }
    loadProjects()
  }, [])

  // Fetch document count
  React.useEffect(() => {
    async function loadDocCount() {
      try {
        const docs = await ApiClient.get<Document[]>('/documents')
        if (Array.isArray(docs)) {
          setDocCount(docs.length)
        }
      } catch (err) {
        // Silent fail as this is enhancement
        console.error('Failed to load doc count', err)
      }
    }
    if (user) {
      loadDocCount()
    }
  }, [user])

  // Fetch organization members and join socket room
  React.useEffect(() => {
    if (!user?.organization?.id) return

    // Join online presence channel
    joinOrganization(user.organization.id)

    // Fetch static member list
    ApiClient.get<{ members: ApiMember[] }>(`/orgs/${user.organization.id}`)
      .then((data) => {
        if (data.members) {
          const mapped = data.members.map((m: ApiMember) => ({
            id: m.user.id,
            name: m.user.full_name || m.user.email,
            avatar: (m.user.full_name || m.user.email || '??').substring(0, 2).toUpperCase(),
            email: m.user.email
          }))
          setMembers(mapped)
        }
      })
      .catch((err) => console.error('Failed to load members:', err))
  }, [user?.organization?.id])

  // Listen for online status updates
  React.useEffect(() => {
    const unsubOnline = onUserOnline((user) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.add(user.userId)
        return next
      })
    })

    const unsubOffline = onUserOffline((data) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(data.userId)
        return next
      })
    })

    const unsubJoined = onJoinedOrganization((data) => {
      setOnlineUsers(new Set(data.onlineUsers.map((u) => u.userId)))
    })

    return () => {
      unsubOnline()
      unsubOffline()
      unsubJoined()
    }
  }, [])

  const organizations = user?.organization
    ? [{ id: 1, name: user.organization.name, color: 'bg-primary' }]
    : [{ id: 1, name: activeOrg || 'Organization', color: 'bg-primary' }]

  const teamMembers = React.useMemo(() => {
    return members.map((m) => ({
      ...m,
      online: onlineUsers.has(m.id),
      // If we don't have members loaded yet, but we rely on hardcoded for fallback, logic is tricky.
      // For now, if members is empty, we show nothing or fallback?
      // Let's assume real data only.
    }))
  }, [members, onlineUsers])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 space-y-4">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 text-sidebar-foreground">
          <Logo size={20} />
          <span className="text-[15px] font-semibold tracking-tight">SynergySpace</span>
        </Link>
        {/* Organization Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowOrgMenu(!showOrgMenu)}
            className="w-full flex items-center justify-between rounded-xl border border-sidebar-border bg-card p-2.5 transition-colors hover:bg-sidebar-accent"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-mono text-xs font-semibold text-primary-foreground">
                {(activeOrg || 'O').slice(0, 1).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-sidebar-foreground">
                  {activeOrg}
                </p>
                <p className="text-xs text-sidebar-foreground/60">Organization</p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-sidebar-foreground/60" />
          </button>

          {/* Dropdown */}
          {showOrgMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50"
            >
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setActiveOrg(org.name)
                    setShowOrgMenu(false)
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-secondary transition-colors ${activeOrg === org.name ? 'bg-secondary' : ''
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 ${org.color} rounded-md`} />
                    <span className="text-sm font-medium">{org.name}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-7">
        {/* Quick Access */}
        <div className="space-y-2">
          <p className="text-eyebrow px-3">
            Quick Access
          </p>
          <nav className="space-y-1">
            {[
              { icon: LayoutGrid, label: 'Dashboard', href: '/dashboard' },
              { icon: FolderOpen, label: 'Projects', href: '/projects' },
              { icon: FileText, label: 'Documents', href: '/dashboard/documents', badge: docCount },
              { icon: Presentation, label: 'Presentations', href: '/dashboard/presentations' },
              { icon: Palette, label: 'Canvas', href: '/dashboard/canvas' },
              { icon: Users, label: 'Team', href: '/dashboard/team' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <button className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors ${pathname === item.href ? 'bg-card text-sidebar-foreground shadow-soft' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}>
                    <Icon className="h-4 w-4 opacity-80 group-hover:opacity-100" />
                    <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Projects */}
        <div className="space-y-2">
          <p className="text-eyebrow px-3">
            Projects
          </p>
          <div className="space-y-1">
            {projects.map((project) => (
              <motion.button
                key={project.id}
                whileHover={{ x: 2 }}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sidebar-foreground/40 group-hover:bg-accent" />
                  <span className="text-sm font-medium truncate">
                    {project.name}
                  </span>
                </div>
                {/* 
                <Badge
                  variant="secondary"
                  className="text-xs bg-sidebar-accent text-sidebar-foreground"
                >
                  {project.members}
                </Badge> 
                */}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="space-y-2">
          <p className="text-eyebrow px-3">
            Team Online
          </p>
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-secondary text-foreground text-[10px] font-semibold">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    {member.online && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border border-sidebar"
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-sidebar-foreground/80">
                    {member.name}
                  </span>
                </div>
                {member.online && (
                  <div className="w-2 h-2 bg-success rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-0.5">
        <Link href="/dashboard/settings">
          <Button
            variant="ghost"
            className="h-9 w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="h-9 w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={() => setShowHelpModal(true)}
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Help
        </Button>
        <HelpModal open={showHelpModal} onOpenChange={setShowHelpModal} />
        <Button
          variant="ghost"
          className="h-9 w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={async () => {
            try {
              await logout()
              router.push('/')
            } catch (err) {
              console.error('Logout failed:', err)
            }
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  )
}
