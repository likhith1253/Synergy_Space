/**
 * Access control helpers. Every service that touches a project-scoped resource
 * must resolve the caller's role through these functions.
 *
 * Missing resources and resources the caller cannot see both yield 404 so that
 * resource ids cannot be probed; a caller who can see the project but lacks the
 * needed level gets 403.
 */

import { getPrismaClient, getProjectRole, roleAllows, isUuid, AccessLevel, ProjectRole } from '@collab/database';
import {
    ProjectNotFoundError,
    DocumentNotFoundError,
    CanvasNotFoundError,
    ForbiddenError,
    ValidationError,
} from '../utils/errors';

const prisma = () => getPrismaClient();

export async function requireProjectAccess(
    projectId: string,
    userId: string,
    level: AccessLevel
): Promise<ProjectRole> {
    const role = await getProjectRole(prisma() as any, projectId, userId);
    if (!role) throw new ProjectNotFoundError();
    if (!roleAllows(role, level)) throw new ForbiddenError('Insufficient permissions for this project');
    return role;
}

export async function requireDocumentAccess(documentId: string, userId: string, level: AccessLevel) {
    if (!isUuid(documentId)) throw new DocumentNotFoundError();
    const document = await prisma().document.findUnique({ where: { id: documentId } });
    if (!document) throw new DocumentNotFoundError();
    const role = await getProjectRole(prisma() as any, document.project_id, userId);
    if (!role) throw new DocumentNotFoundError();
    if (!roleAllows(role, level)) throw new ForbiddenError('Insufficient permissions for this document');
    return { document, role };
}

export async function requireCanvasAccess(canvasId: string, userId: string, level: AccessLevel) {
    if (!isUuid(canvasId)) throw new CanvasNotFoundError();
    const canvas = await prisma().canvas.findUnique({ where: { id: canvasId } });
    if (!canvas) throw new CanvasNotFoundError();
    const role = await getProjectRole(prisma() as any, canvas.project_id, userId);
    if (!role) throw new CanvasNotFoundError();
    if (!roleAllows(role, level)) throw new ForbiddenError('Insufficient permissions for this canvas');
    return { canvas, role };
}

export async function requirePresentationAccess(presentationId: string, userId: string, level: AccessLevel) {
    if (!isUuid(presentationId)) throw new ValidationError('Presentation not found');
    const presentation = await prisma().presentation.findUnique({ where: { id: presentationId } });
    if (!presentation) throw new ValidationError('Presentation not found');
    const role = await getProjectRole(prisma() as any, presentation.project_id, userId);
    if (!role) throw new ProjectNotFoundError();
    if (!roleAllows(role, level)) throw new ForbiddenError('Insufficient permissions for this presentation');
    return { presentation, role };
}

export async function requireSlideAccess(slideId: string, userId: string, level: AccessLevel) {
    if (!isUuid(slideId)) throw new ValidationError('Slide not found');
    const slide = await prisma().slide.findUnique({
        where: { id: slideId },
        include: { presentation: true },
    });
    if (!slide) throw new ValidationError('Slide not found');
    const role = await getProjectRole(prisma() as any, slide.presentation.project_id, userId);
    if (!role) throw new ProjectNotFoundError();
    if (!roleAllows(role, level)) throw new ForbiddenError('Insufficient permissions for this slide');
    return { slide, role };
}

/** Ids of every project the user owns or is a team member of. */
export async function listAccessibleProjectIds(userId: string): Promise<string[]> {
    const [owned, member] = await Promise.all([
        prisma().project.findMany({ where: { owner_id: userId }, select: { id: true } }),
        prisma().teamMember.findMany({ where: { user_id: userId }, select: { project_id: true } }),
    ]);
    return Array.from(new Set([...owned.map((p) => p.id), ...member.map((m) => m.project_id)]));
}
