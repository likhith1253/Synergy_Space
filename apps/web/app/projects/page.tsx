'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    description?: string;
    updated_at: string;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // Fetch projects from the API (proxied via /api/projects)
                const data = await ApiClient.get<{ projects: Project[] } | Project[]>('/projects');

                if (Array.isArray(data)) {
                    setProjects(data);
                } else if (data && Array.isArray((data as any).projects)) {
                    setProjects((data as any).projects);
                } else if (data && Array.isArray((data as any).data)) {
                    // Fallback for potential legacy structure
                    setProjects((data as any).data);
                } else {
                    setProjects([]);
                }
            } catch (err) {
                console.error('Failed to fetch projects:', err);
                setError('Failed to load projects');
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    if (loading) return <div className="p-8">Loading projects...</div>;
    if (error) return <div className="p-8 text-destructive">{error}</div>;

    return (
        <div className="flex flex-col h-full p-8 md:p-12 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your collaborative projects
                    </p>
                </div>
                <Button asChild>
                    <Link href="/projects/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Project
                    </Link>
                </Button>
            </div>

            {projects.length === 0 ? (
                <div className="border border-dashed rounded-lg p-12 text-center">
                    <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-6">Create your first project to get started</p>
                    <Button asChild>
                        <Link href="/projects/new">Create Project</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="group block p-6 bg-card border rounded-lg hover:shadow-md transition-all"
                        >
                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                {project.name}
                            </h3>
                            {project.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                    {project.description}
                                </p>
                            )}
                            <div className="text-xs text-muted-foreground mt-4">
                                Last updated: {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'N/A'}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
