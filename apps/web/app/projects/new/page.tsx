'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';

interface CreatedProject {
  id: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      
      const newProject = await ApiClient.post<CreatedProject>('/projects', {
        name: name.trim(),
        description: description.trim() || undefined
      });

      // Navigate to the new project page
      setError('');
      router.replace(`/projects/${newProject.id}`);
    } catch (err: unknown) {
      console.error('Failed to create project:', err);
      const message = err instanceof Error ? err.message : 'Unable to create project. Please try again.';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </button>
          </Button>
          <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
          <p className="text-muted-foreground">
            Create a new project to organize your documents and collaborate with your team.
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Fill in the details for your new project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Q4 Marketing Campaign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isCreating}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  className="w-full min-h-[100px] px-3 py-2 text-sm ring-offset-background border border-input bg-background rounded-md placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Brief description of your project (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !name.trim()}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Creating Project...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
