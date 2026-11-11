'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Users, Calendar, ArrowRight, Plus, Presentation, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiClient } from '@/lib/api-client';
import { getProjectDocuments, createProjectDocument } from '@/lib/documents';

interface Project {
  id: string;
  name: string;
  description?: string;
  updated_at: string;
  created_at?: string;
  members?: Array<{ id: string; name: string; email: string }>;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Handle invalid project ID
  useEffect(() => {
    if (projectId === 'undefined') {
      router.push('/dashboard');
    }
  }, [projectId, router]);

  const [project, setProject] = useState<Project | null>(null);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || projectId === 'undefined') return;

      try {
        setLoading(true);
        // Fetch project details
        const projectData = await ApiClient.get<Project>(`/projects/${projectId}`);
        setProject(projectData);

        // Fetch documents count
        const docs = await getProjectDocuments(projectId);
        setDocCount(docs.length);

      } catch (err) {
        console.error('Failed to fetch project data:', err);
        setError('Unable to load project details. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleCreateDocument = async () => {
    try {
      setCreating(true);
      const newDoc = await createProjectDocument('Untitled Document', projectId);
      router.push(`/documents/${newDoc.id}`);
    } catch (err) {
      console.error('Failed to create document:', err);
      setError('Unable to create document. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await ApiClient.post(`/invites`, { projectId, email: inviteEmail });
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setTimeout(() => {
        setIsInviteOpen(false);
        setInviteSuccess(null);
      }, 2000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground">{error || 'Project not found'}</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex w-full items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{project.name}</h1>
            <p className="text-lg text-muted-foreground">{project.description || 'No description provided'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
              <Users className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back</Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {/* Documents Count */}
          <div className="p-6 rounded-lg border border-border hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Documents</p>
                <p className="text-3xl font-bold">{docCount}</p>
              </div>
              <FileText className="w-6 h-6 text-accent" />
            </div>
          </div>

          {/* Collaborators */}
          <div className="p-6 rounded-lg border border-border hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Collaborators</p>
                <p className="text-3xl font-bold">{project.members?.length || 1}</p>
              </div>
              <Users className="w-6 h-6 text-accent" />
            </div>
          </div>

          {/* Updated Date */}
          <div className="p-6 rounded-lg border border-border hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p className="text-base font-semibold">
                  {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <Calendar className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href={`/projects/${projectId}/documents`}>
                <Button
                  variant="outline"
                  className="w-full justify-between group bg-transparent h-auto py-4"
                >
                  <span className="font-medium">View All Documents</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-between group bg-transparent h-auto py-4"
                onClick={handleCreateDocument}
                disabled={creating}
              >
                <span className="font-medium">
                  {creating ? 'Creating...' : 'Create New Document'}
                </span>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Presentations & Slides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href={`/projects/${projectId}/presentations`}>
                <Button
                  variant="outline"
                  className="w-full justify-between group bg-transparent h-auto py-4"
                >
                  <span className="font-medium">View All Presentations</span>
                  <Presentation className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href={`/projects/${projectId}/presentations`}>
                <Button
                  variant="outline"
                  className="w-full justify-between group bg-transparent h-auto py-4"
                >
                  <span className="font-medium">Create New Presentation</span>
                  <Plus className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to {project.name}</DialogTitle>
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
  )
}
