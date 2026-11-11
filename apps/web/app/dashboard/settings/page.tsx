'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const [workspaceName, setWorkspaceName] = useState('Acme Corp')
  const [workspaceSlug, setWorkspaceSlug] = useState('acme-corp')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1000)
  }

  const handleDelete = () => {
    setIsDeleting(true)
    setTimeout(() => setIsDeleting(false), 1000)
  }

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-4xl font-bold mb-2">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace details and billing settings.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>Workspace Configuration</CardTitle>
            <CardDescription>Update your workspace identity and URL slug.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="workspaceName">Workspace Name</Label>
              <Input
                id="workspaceName"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Enter workspace name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="workspaceSlug">Workspace URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground bg-muted px-3 py-2 rounded-md border text-sm">
                  app.example.com/
                </span>
                <Input
                  id="workspaceSlug"
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value)}
                  placeholder="workspace-slug"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions for your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete a workspace, there is no going back. Please be certain.
            </p>
          </CardContent>
          <CardFooter className="flex border-t border-destructive/20 pt-6">
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Workspace'}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
