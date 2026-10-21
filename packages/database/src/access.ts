/**
 * Project access control shared by the document and collab services.
 *
 * Effective role on a project:
 *   owner  - projects.owner_id
 *   admin / editor / viewer - team_members.role
 * Anyone else has no access.
 */

export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type AccessLevel = 'read' | 'write' | 'delete' | 'manage';

export const TEAM_ROLES = ['admin', 'editor', 'viewer'] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

export function isTeamRole(value: unknown): value is (typeof TEAM_ROLES)[number] {
    return typeof value === 'string' && (TEAM_ROLES as readonly string[]).includes(value);
}

/** Which roles satisfy each level. Unknown roles satisfy nothing (fail closed). */
const ALLOWED: Record<AccessLevel, ProjectRole[]> = {
    read: ['owner', 'admin', 'editor', 'viewer'],
    write: ['owner', 'admin', 'editor'],
    delete: ['owner', 'admin'],
    manage: ['owner'],
};

export function roleAllows(role: string | null | undefined, level: AccessLevel): boolean {
    return !!role && (ALLOWED[level] as string[]).includes(role);
}

/** Minimal structural type so callers (and tests) can pass a Prisma client or a mock. */
export interface AccessPrisma {
    project: {
        findUnique(args: { where: { id: string }; select: { owner_id: true } }): Promise<{ owner_id: string } | null>;
    };
    teamMember: {
        findUnique(args: {
            where: { project_id_user_id: { project_id: string; user_id: string } };
            select: { role: true };
        }): Promise<{ role: string } | null>;
    };
}

/** Returns the user's role on the project, or null if the project does not exist / user has no access. */
export async function getProjectRole(
    prisma: AccessPrisma,
    projectId: string,
    userId: string
): Promise<ProjectRole | null> {
    if (!isUuid(projectId) || !isUuid(userId)) return null;

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { owner_id: true } });
    if (!project) return null;
    if (project.owner_id === userId) return 'owner';

    const member = await prisma.teamMember.findUnique({
        where: { project_id_user_id: { project_id: projectId, user_id: userId } },
        select: { role: true },
    });
    if (member && isTeamRole(member.role)) return member.role;
    return null;
}
