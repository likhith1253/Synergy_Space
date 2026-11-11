'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Plus, Search, Calendar, MoreVertical, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProjectDocuments, createProjectDocument, type Document } from '@/lib/documents';
import { ApiClient } from '@/lib/api-client';

export default function ProjectDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Handle invalid project ID
  useEffect(() => {
    if (projectId === 'undefined') {
      router.push('/dashboard');
    }
  }, [projectId, router]);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [projectName, setProjectName] = useState('Project');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || projectId === 'undefined') return;

      try {
        setLoading(true);
        // Fetch project details for the name
        // We could optimize this by passing project data or catching it, but separate fetch is safer for deep links
        const projectData = await ApiClient.get<{ name: string }>(`/projects/${projectId}`);
        setProjectName(projectData.name);

        const docs = await getProjectDocuments(projectId);
        setDocuments(docs);
      } catch (err) {
        console.error('Failed to load project data:', err);
        setError('Failed to load documents');
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
      // Optional: Show toast error
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <span>/</span>
            <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
              {projectName}
            </Link>
            <span>/</span>
            <span className="text-foreground">Documents</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
              <p className="text-muted-foreground mt-1">
                Manage and collaborate on documents for {projectName}
              </p>
            </div>
            <Button onClick={handleCreateDocument} disabled={creating} className="shrink-0">
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  New Document
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filters/Search (Placeholder) */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search documents" className="pl-10" />
          </div>
        </div>

        {/* Documents Grid */}
        {error ? (
          <div className="text-center py-12 text-destructive">
            <p>{error}</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No documents</h3>
            <p className="text-muted-foreground mb-6">Create a document to begin collaborating</p>
            <Button onClick={handleCreateDocument} disabled={creating} variant="outline">
              Create Document
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Link href={`/documents/${doc.id}`} key={doc.id} className="block group">
                <div className="border rounded-lg p-5 hover:border-primary/50 hover:shadow-md transition-all h-full bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    {/* Placeholder for menu */}
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
                    {doc.title || 'Untitled'}
                  </h3>
                  <div className="flex items-center text-xs text-muted-foreground mt-4">
                    <Calendar className="w-3 h-3 mr-1" />
                    <span>Updated {new Date(doc.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
