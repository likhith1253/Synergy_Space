/**
 * Team Service
 * Business logic for project team management
 */

import { PrismaClient } from '@collab/database';
import { ProjectNotFoundError, UserNotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { isTeamRole } from '@collab/database';
import { requireProjectAccess } from './access.service';


const prisma = new PrismaClient();

// Helper to access teamMember property safely until TS server picks up changes
const teamMemberClient = (prisma as any).teamMember;

/**
 * Get all team members for a project
 */
export async function getProjectTeam(projectId: string, userId: string) {
    await requireProjectAccess(projectId, userId, 'read');
    const members = await teamMemberClient.findMany({
        where: { project_id: projectId },
        include: {
            user: {
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    avatar_url: true
                }
            }
        },
        orderBy: { joined_at: 'asc' }
    });

    return members.map((member: any) => ({
        userId: member.user_id,
        name: member.user.full_name,
        email: member.user.email,
        avatar: member.user.avatar_url,
        role: member.role,
        joinedAt: member.joined_at
    }));
}

/**
 * Add a team member to a project
 */
export async function addTeamMember(
    projectId: string,
    email: string,
    role: string = 'viewer',
    currentUserId: string
) {
    if (!isTeamRole(role)) {
        throw new ValidationError('Role must be one of: admin, editor, viewer');
    }

    // 1. Verify Project and Permissions (Owner check)
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new ProjectNotFoundError();
    }

    if (project.owner_id !== currentUserId) {
        throw new ForbiddenError('Only the project owner can add members');
    }

    // 2. Find User by Email
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        throw new UserNotFoundError(`User with email ${email} not found`);
    }

    // 3. Check if already a member
    const existingMember = await teamMemberClient.findUnique({
        where: {
            project_id_user_id: {
                project_id: projectId,
                user_id: user.id
            }
        }
    });

    if (existingMember) {
        throw new ValidationError('User is already a team member');
    }

    // 4. Create Team Member
    const member = await teamMemberClient.create({
        data: {
            project_id: projectId,
            user_id: user.id,
            role
        },
        include: {
            user: true
        }
    });

    return {
        userId: member.user_id,
        name: member.user.full_name,
        email: member.user.email,
        avatar: member.user.avatar_url,
        role: member.role,
        joinedAt: member.joined_at
    };
}

/**
 * Remove a team member from a project
 */
export async function removeTeamMember(
    projectId: string,
    targetUserId: string,
    currentUserId: string
) {
    // 1. Verify Project and Permissions
    const project = await prisma.project.findUnique({
        where: { id: projectId }
    });

    if (!project) {
        throw new ProjectNotFoundError();
    }

    // Allow owner to remove anyone, or user to leave (remove themselves)
    if (project.owner_id !== currentUserId && targetUserId !== currentUserId) {
        throw new ForbiddenError('Insufficient permissions');
    }

    // Prevent owner from leaving if they are the only owner (simplification)
    if (project.owner_id === targetUserId) {
        throw new ValidationError('Project owner cannot be removed from the team');
    }

    // 2. Delete Member
    await teamMemberClient.delete({
        where: {
            project_id_user_id: {
                project_id: projectId,
                user_id: targetUserId
            }
        }
    });

    return { success: true };
}
