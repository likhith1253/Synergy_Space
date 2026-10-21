/**
 * Authorization for realtime rooms.
 *
 * Authentication (a valid JWT) only proves who the caller is. Joining or writing to a
 * room additionally requires a role on the project that owns the resource, resolved
 * from the database on every join (not from claims in the token).
 */

import { getPrismaClient, getProjectRole, roleAllows, isUuid } from '@collab/database';

const prisma = () => getPrismaClient();

export interface RoomAccess {
    allowed: boolean;
    canWrite: boolean;
}

const DENIED: RoomAccess = { allowed: false, canWrite: false };

async function accessForProject(projectId: string | null | undefined, userId: string): Promise<RoomAccess> {
    if (!projectId) return DENIED;
    const role = await getProjectRole(prisma() as any, projectId, userId);
    return { allowed: roleAllows(role, 'read'), canWrite: roleAllows(role, 'write') };
}

/** The web client joins the same room type with either a document id or a canvas id. */
export async function getDocumentRoomAccess(resourceId: string, userId: string): Promise<RoomAccess> {
    if (!isUuid(resourceId)) return DENIED;
    const document = await prisma().document.findUnique({ where: { id: resourceId }, select: { project_id: true } });
    if (document) return accessForProject(document.project_id, userId);
    const canvas = await prisma().canvas.findUnique({ where: { id: resourceId }, select: { project_id: true } });
    return accessForProject(canvas?.project_id, userId);
}

export async function getSlideRoomAccess(slideId: string, userId: string): Promise<RoomAccess> {
    if (!isUuid(slideId)) return DENIED;
    const slide = await prisma().slide.findUnique({
        where: { id: slideId },
        select: { presentation: { select: { project_id: true } } },
    });
    return accessForProject(slide?.presentation.project_id, userId);
}

export async function getProjectRoomAccess(projectId: string, userId: string): Promise<RoomAccess> {
    if (!isUuid(projectId)) return DENIED;
    return accessForProject(projectId, userId);
}

export async function isOrganizationMember(organizationId: string, userId: string): Promise<boolean> {
    if (!isUuid(organizationId) || !isUuid(userId)) return false;
    const [user, membership] = await Promise.all([
        prisma().user.findUnique({ where: { id: userId }, select: { organization_id: true } }),
        prisma().organizationMember.findUnique({
            where: { organization_id_user_id: { organization_id: organizationId, user_id: userId } },
            select: { id: true },
        }),
    ]);
    return user?.organization_id === organizationId || !!membership;
}
