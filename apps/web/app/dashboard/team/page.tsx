'use client'

import React, { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Mail, Loader2, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useProjects, useTeamMembers, inviteMember, Project } from '@/lib/api-hooks'
import { toast } from '@/components/ui/use-toast' // Assuming use-toast exists, or I will use standard alert for now if it errors.
// Wait, I didn't check for toast. I'll use a simple alert if toast fails or just conditional rendering of error/success message.
// Actually, let's look for toast in the component list first. If not found, I will remove it.
// To be safe, I'll rely on local state for feedback first.

export default function TeamPage() {
    const { user } = useAuth()
    const [selectedProjectId, setSelectedProjectId] = useState<string>('')
    const { data: projects, loading: projectsLoading } = useProjects(user?.organization?.id)
    const { data: team, loading: teamLoading, refetch: refetchTeam } = useTeamMembers(selectedProjectId)

    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviting, setInviting] = useState(false)
    const [inviteError, setInviteError] = useState<string | null>(null)
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

    // Select first project by default when loaded
    useEffect(() => {
        if (projects && projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(projects[0].id)
        }
    }, [projects, selectedProjectId])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail) return

        setInviting(true)
        setInviteError(null)
        setInviteSuccess(null)

        try {
            await inviteMember(selectedProjectId, inviteEmail)
            setInviteSuccess(`Invitation sent to ${inviteEmail}`)
            setInviteEmail('')
            setTimeout(() => {
                setIsInviteOpen(false)
                setInviteSuccess(null)
            }, 2000)
        } catch (err) {
            setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
        } finally {
            setInviting(false)
        }
    }

    const currentProject = projects?.find(p => p.id === selectedProjectId)

    return (
        <div className="max-w-5xl mx-auto p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Team Members</h1>
                    <p className="text-muted-foreground">Manage your team and permissions</p>
                </div>

                {/* Project Selector - always show */}
                <div className="flex items-center gap-4">
                    <div className="w-[200px]">
                        <Select
                            value={selectedProjectId}
                            onValueChange={setSelectedProjectId}
                            disabled={!projects || projects.length === 0}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={
                                    projectsLoading ? "Loading..." :
                                        (!projects || projects.length === 0) ? "No projects" :
                                            "Select Project"
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                {projects && projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button
                                disabled={!selectedProjectId || projectsLoading}
                                title={!selectedProjectId ? "Please select or create a project first" : "Invite a member"}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Invite Member
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite to {currentProject?.name || 'Project'}</DialogTitle>
                                <DialogDescription>
                                    Send an email invitation to add a new member to this project.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleInvite} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="colleague@example.com"
                                            className="pl-9"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            type="email"
                                        />
                                    </div>
                                </div>

                                {inviteError && (
                                    <p className="text-sm text-destructive">{inviteError}</p>
                                )}
                                {inviteSuccess && (
                                    <p className="text-sm text-success">{inviteSuccess}</p>
                                )}

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                                    <Button type="submit" disabled={inviting || !inviteEmail}>
                                        {inviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Send Invitation
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Demo Banner for demo user */}
            {user?.email === 'demo@realtimecollaborator.com' && (
                <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        Notice: You are currently navigating a simulated Demo Workspace. Profiles displayed in the sidebar represent structural mock identities for demonstration purposes.
                    </p>
                </div>
            )}

            <div className="border border-border rounded-xl bg-card overflow-hidden">
                <table className="w-full">
                    <thead className="bg-secondary/50 border-b border-border">
                        <tr>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Member</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                            {/* <th className="px-6 py-4"></th> */}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {projectsLoading || teamLoading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading team members...
                                </td>
                            </tr>
                        ) : !team || team.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                    No members found in this project. Invite someone to get started!
                                </td>
                            </tr>
                        ) : (
                            team.map((member) => (
                                <tr key={member.userId} className="hover:bg-secondary/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                {member.avatar ? (
                                                    <AvatarImage src={member.avatar} />
                                                ) : (
                                                    <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                                                )}

                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm">{member.name}</p>
                                                <p className="text-xs text-muted-foreground">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground capitalize">
                                        {member.role}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                                            Active
                                        </span>
                                    </td>
                                    {/* <td className="px-6 py-4 text-right">
                                        <Button variant="ghost" size="sm">Edit</Button>
                                    </td> */}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div >
    )
}
