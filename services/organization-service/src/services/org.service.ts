import { PrismaClient } from '@collab/database';
// @ts-ignore - Local module resolution
import { createLogger } from '@packages/logger';
import { CreateOrganizationSchema } from '@packages/types';
import { z } from 'zod';

const prisma = new PrismaClient();
const logger = createLogger('organization-service');

// type CreateOrgInput = z.infer<typeof CreateOrganizationSchema>;
interface CreateOrgInput {
    name: string;
    slug?: string;
}

export class OrgService {
    async createOrganization(userId: string, data: CreateOrgInput) {
        const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

        return await prisma.$transaction(async (tx) => {
            const org = await tx.organization.create({
                data: {
                    name: data.name,
                    slug: slug,
                },
            });

            await tx.organizationMember.create({
                data: {
                    user_id: userId,
                    organization_id: org.id,
                    role: 'owner',
                },
            });

            logger.info(`Organization created: ${org.id} by user ${userId}`);
            return org;
        });
    }

    /** The caller's role in the organization, or null when they are not a member. */
    async getMemberRole(orgId: string, userId: string): Promise<string | null> {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) return null;
        const member = await prisma.organizationMember.findUnique({
            where: { organization_id_user_id: { organization_id: orgId, user_id: userId } },
            select: { role: true }
        });
        return member ? member.role : null;
    }

    async getOrganization(orgId: string) {
        return await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                full_name: true,
                                email: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async getUserOrganizations(userId: string) {
        const memberships = await prisma.organizationMember.findMany({
            where: { user_id: userId },
            include: {
                organization: true,
            },
        });

        return memberships.map((m) => ({
            ...m.organization,
            role: m.role,
            joined_at: m.joined_at,
        }));
    }

    async addMember(orgId: string, email: string, role: string = 'member') {
        const user = await prisma.user.findFirst({
            where: { email }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const existingMember = await prisma.organizationMember.findUnique({
            where: {
                organization_id_user_id: {
                    organization_id: orgId,
                    user_id: user.id
                }
            }
        });

        if (existingMember) {
            throw new Error('User is already a member');
        }

        const member = await prisma.organizationMember.create({
            data: {
                organization_id: orgId,
                user_id: user.id,
                role: role
            },
            include: {
                user: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true
                    }
                }
            }
        });

        logger.info(`Added member ${user.id} to org ${orgId}`);
        return member;
    }
}
