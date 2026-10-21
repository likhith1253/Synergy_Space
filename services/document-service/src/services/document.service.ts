/**
 * Document Service
 * Business logic for document management (non-realtime operations)
 */

import { PrismaClient, Document, DocumentVersion } from '@collab/database';
import { requireProjectAccess, requireDocumentAccess, listAccessibleProjectIds } from './access.service';

const prisma = new PrismaClient();

/**
 * Create a new document
 */
export async function createDocument(
    title: string,
    projectId: string,
    userId: string
) {
    // Creating a document requires write access to the project
    await requireProjectAccess(projectId, userId, 'write');

    const document = await prisma.document.create({
        data: {
            title,
            project_id: projectId,
            owner_id: userId
        }
    });

    return {
        id: document.id,
        title: document.title,
        owner_id: document.owner_id,
        created_at: document.created_at.toISOString()
    };
}

/**
 * List documents in a project
 */
export async function listDocuments(projectId: string, userId: string) {
    await requireProjectAccess(projectId, userId, 'read');

    const documents = await prisma.document.findMany({
        where: { project_id: projectId },
        orderBy: { updated_at: 'desc' }
    });

    return documents.map((doc: Document) => ({
        id: doc.id,
        title: doc.title,
        owner_id: doc.owner_id,
        created_at: doc.created_at.toISOString(),
        updated_at: doc.updated_at.toISOString()
    }));
}

/**
 * List ALL documents for the user (owned or collaborator)
 */
export async function listAllDocuments(userId: string) {
    const projectIds = await listAccessibleProjectIds(userId);
    const documents = await prisma.document.findMany({
        where: { project_id: { in: projectIds } },
        include: {
            project: {
                select: { name: true }
            }
        },
        orderBy: { updated_at: 'desc' }
    });

    return documents.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        owner_id: doc.owner_id,
        project: doc.project.name,
        project_id: doc.project_id,
        created_at: doc.created_at.toISOString(),
        updated_at: doc.updated_at.toISOString()
    }));
}

/**
 * Get a single document by ID
 */
export async function getDocument(documentId: string, userId: string) {
    const { document } = await requireDocumentAccess(documentId, userId, 'read');

    let contentStr = '';
    if (document.yjs_binary_state) {
        contentStr = document.yjs_binary_state.toString('utf8');
        // If it starts and ends with quotes, it was JSON.stringified
        if (contentStr.startsWith('"') && contentStr.endsWith('"')) {
            try {
                contentStr = JSON.parse(contentStr);
            } catch (e) {
                // Keep as is if parsing fails
            }
        }
    }

    return {
        id: document.id,
        title: document.title,
        content: contentStr,
        project_id: document.project_id,
        updated_at: document.updated_at.toISOString()
    };
}

/**
 * Update a document (title and/or content)
 */
export async function updateDocument(
    documentId: string,
    userId: string,
    updates: { title?: string; content?: unknown }
) {
    // Viewers may read but not modify
    await requireDocumentAccess(documentId, userId, 'write');

    const data: { title?: string; yjs_binary_state?: Buffer } = {};
    if (updates.title !== undefined) {
        data.title = updates.title;
    }
    if (updates.content !== undefined) {
        // Store content as buffer for non-realtime operations. Avoid double-stringifying strings.
        const contentStr = typeof updates.content === 'string'
            ? updates.content
            : JSON.stringify(updates.content);
        // Remove null bytes before saving
        data.yjs_binary_state = Buffer.from(contentStr.replace(/\u0000/g, ''), 'utf8');
    }

    const document = await prisma.document.update({
        where: { id: documentId },
        data
    });

    return {
        id: document.id,
        title: document.title,
        content: document.yjs_binary_state?.toString('utf8') || '',
        project_id: document.project_id,
        updated_at: document.updated_at.toISOString()
    };
}

/**
 * Delete a document and its versions
 */
export async function deleteDocument(documentId: string, userId: string) {
    // Only the project owner or an admin may delete
    await requireDocumentAccess(documentId, userId, 'delete');

    // Delete versions first
    await prisma.documentVersion.deleteMany({
        where: { document_id: documentId }
    });

    // Delete document
    await prisma.document.delete({
        where: { id: documentId }
    });

    return { success: true };
}

/**
 * Create a new version snapshot
 */
export async function createVersion(
    documentId: string,
    name: string,
    userId: string
) {
    const { document } = await requireDocumentAccess(documentId, userId, 'write');

    // Create version with current document state
    const version = await prisma.documentVersion.create({
        data: {
            document_id: documentId,
            name: name || null,
            created_by: userId,
            snapshot_binary: document.yjs_binary_state // Copy current state
        }
    });

    return {
        id: version.id,
        name: version.name,
        created_at: version.created_at.toISOString()
    };
}

/**
 * List version history for a document
 */
export async function listVersions(documentId: string, userId: string) {
    await requireDocumentAccess(documentId, userId, 'read');

    const versions = await prisma.documentVersion.findMany({
        where: { document_id: documentId },
        orderBy: { created_at: 'desc' }
    });

    return versions.map((version: DocumentVersion) => ({
        id: version.id,
        name: version.name,
        created_at: version.created_at.toISOString(),
        created_by: version.created_by
    }));
}
