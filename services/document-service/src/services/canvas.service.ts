/**
 * Canvas Service
 * Business logic for canvas management
 */

import { PrismaClient } from '@collab/database';
import { requireProjectAccess, requireCanvasAccess } from './access.service';

const prisma = new PrismaClient();

/**
 * Get all canvases for a project
 */
export async function getProjectCanvases(projectId: string, userId: string) {
    await requireProjectAccess(projectId, userId, 'read');

    // Get all canvases for the project
    const canvases = await prisma.$queryRaw`
        SELECT * FROM canvas 
        WHERE project_id = ${projectId}::uuid 
        ORDER BY created_at DESC
    `;

    if (!canvases || !Array.isArray(canvases)) {
        return [];
    }

    return canvases.map((c: any) => ({
        id: c.id,
        project_id: c.project_id,
        data: c.data,
        name: c.name,
        created_at: c.created_at
    }));
}

/**
 * Get a single canvas by ID
 */
export async function getCanvasById(canvasId: string, userId: string) {
    const { canvas } = await requireCanvasAccess(canvasId, userId, 'read');

    return {
        id: canvas.id,
        project_id: canvas.project_id,
        data: canvas.data,
        name: canvas.name,
        created_at: canvas.created_at,
        updated_at: canvas.updated_at
    };
}

/**
 * Get a single canvas (backward compatibility / specific fetch)
 * Returns the most recently created/updated canvas if multiple exist, or null
 */
export async function getProjectCanvas(projectId: string, userId: string) {
    const canvases = await getProjectCanvases(projectId, userId);

    if (canvases.length === 0) {
        return {
            id: null,
            project_id: projectId,
            data: {},
            name: 'Untitled Canvas',
            created_at: null
        };
    }

    return canvases[0]; // First one (ORDER BY created_at DESC)
}

/**
 * Create a new canvas for a project
 */
export async function createProjectCanvas(projectId: string, data: any, userId: string, name: string = 'Untitled Canvas') {
    await requireProjectAccess(projectId, userId, 'write');

    // Create new canvas
    const result = await prisma.$queryRaw`
        INSERT INTO canvas (project_id, data, name) 
        VALUES (${projectId}::uuid, ${JSON.stringify(data)}::jsonb, ${name}) 
        RETURNING *
    `;

    const canvasData = Array.isArray(result) ? result[0] : result;

    return {
        id: canvasData.id,
        project_id: canvasData.project_id,
        data: canvasData.data,
        name: canvasData.name,
        created_at: canvasData.created_at,
        updated_at: canvasData.updated_at
    };
}

/**
 * Update canvas
 */
export async function updateCanvas(canvasId: string, data: any, userId: string, name?: string) {
    await requireCanvasAccess(canvasId, userId, 'write');

    // Update canvas
    let result;
    if (name) {
        result = await prisma.$queryRaw`
            UPDATE canvas 
            SET data = ${JSON.stringify(data)}::jsonb, name = ${name}, updated_at = NOW()
            WHERE id = ${canvasId}::uuid 
            RETURNING *
        `;
    } else {
        result = await prisma.$queryRaw`
            UPDATE canvas 
            SET data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()
            WHERE id = ${canvasId}::uuid 
            RETURNING *
        `;
    }
    // Note: I added updated_at = NOW() but schema might not support it for Canvas yet if I didn't add the field?
    // Let's verify schema again. Line 239 `created_at`. No `updated_at`.
    // So I should REMOVE `updated_at = NOW()` from query, OR add it to schema.
    // I prefer adding it to schema for correctness.

    // I will add updated_at to Schema in same push.

    const canvasData = Array.isArray(result) ? result[0] : result;

    return {
        id: canvasData.id,
        project_id: canvasData.project_id,
        data: canvasData.data,
        name: canvasData.name,
        created_at: canvasData.created_at,
        updated_at: canvasData.updated_at
    };
}
