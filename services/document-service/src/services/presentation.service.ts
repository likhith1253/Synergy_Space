/**
 * Presentation Service
 * Business logic for presentation management
 */

import { PrismaClient } from '@collab/database';
import { requireProjectAccess, requirePresentationAccess } from './access.service';

const prisma = new PrismaClient();

/**
 * Create a new presentation
 */
export async function createPresentation(
    projectId: string,
    title: string,
    userId: string,
    template?: string
) {
    await requireProjectAccess(projectId, userId, 'write');

    const presentation = await prisma.presentation.create({
        data: {
            project_id: projectId,
            title,
            template
        }
    });

    return presentation;
}

/**
 * List presentations for a project
 */
export async function listPresentations(projectId: string, userId: string) {
    await requireProjectAccess(projectId, userId, 'read');

    const presentations = await prisma.presentation.findMany({
        where: { project_id: projectId },
        orderBy: { created_at: 'desc' }
    });

    return presentations;
}

/**
 * Get a single presentation
 */
export async function getPresentation(presentationId: string, userId: string) {
    const { presentation } = await requirePresentationAccess(presentationId, userId, 'read');

    return presentation;
}
