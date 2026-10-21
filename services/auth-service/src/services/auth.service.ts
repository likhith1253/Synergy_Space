import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { SigninUser, SignupUser } from '@packages/types';
import { getPrismaClient } from '@collab/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
// @ts-ignore - Local module resolution
import { createLogger } from '@packages/logger';
import { seedDemoWorkspace } from '../utils/demo-seeder';

const prisma = getPrismaClient();
const logger = createLogger('auth-service');

// Hash of a random value, used only to equalise login timing for unknown accounts
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 10);

export class AuthService {
    async register(data: SignupUser) {
        logger.info(`[AuthService] register: Attempting registration for ${data.email}`);
        
        const existingUser = await prisma.user.findFirst({
            where: { email: data.email },
        });

        if (existingUser) {
            // Respond exactly as for a new address so the endpoint cannot be used to enumerate accounts
            logger.info('[AuthService] register: address already registered, no verification issued');
            return {
                success: true,
                message: 'Verification email sent. Please check your inbox (or backend console) to complete registration.'
            };
        }

        let invitation = null;
        if ((data as any).inviteToken) {
            invitation = await prisma.invitation.findUnique({ where: { token: (data as any).inviteToken } });
            if (!invitation || invitation.expires_at < new Date() || invitation.accepted) {
                throw new Error('Invalid or expired invite token');
            }
            if (invitation.email !== data.email) {
                throw new Error('Invite email does not match signup email');
            }
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Store temporarily instead of immediately creating the account
        await prisma.pendingUser.upsert({
            where: { email: data.email },
            update: {
                password_hash: hashedPassword,
                full_name: data.full_name,
                token,
                invite_token: (data as any).inviteToken || null,
                expires_at: expiresAt
            },
            create: {
                email: data.email,
                password_hash: hashedPassword,
                full_name: data.full_name,
                token,
                invite_token: (data as any).inviteToken || null,
                expires_at: expiresAt
            }
        });

        const verifyUrl = `http://localhost:3000/auth/verify?token=${token}`;
        logger.info(`\n\n======================================================`);
        logger.info(`[ACTION REQUIRED] MOCK EMAIL VERIFICATION LINK GENERATED`);
        logger.info(`Send this to: ${data.email}`);
        logger.info(`Link: ${verifyUrl}`);
        logger.info(`======================================================\n\n`);

        return {
            success: true,
            message: 'Verification email sent. Please check your inbox (or backend console) to complete registration.'
        };
    }

    async verifyEmail(token: string) {
        const pendingUser = await prisma.pendingUser.findUnique({ where: { token } });
        if (!pendingUser) throw new Error('Invalid or expired verification token');
        
        if (pendingUser.expires_at < new Date()) {
            await prisma.pendingUser.delete({ where: { id: pendingUser.id } });
            throw new Error('Verification token has expired. Please register again.');
        }

        const existingUser = await prisma.user.findUnique({ where: { email: pendingUser.email } });
        if (existingUser) {
            await prisma.pendingUser.delete({ where: { id: pendingUser.id } });
            throw new Error('User already exists');
        }

        const user = await prisma.$transaction(async (tx: any) => {
            let targetOrgId = null;
            let assignedRole = 'owner';
            
            if (pendingUser.invite_token) {
                const invitation = await tx.invitation.findUnique({ where: { token: pendingUser.invite_token } });
                if (!invitation || invitation.expires_at < new Date() || invitation.accepted) {
                    throw new Error('Original invite token is invalid or expired');
                }
                const project = await tx.project.findUnique({ where: { id: invitation.project_id } });
                targetOrgId = project.organization_id;
                assignedRole = 'member';

                const newUser = await tx.user.create({
                    data: {
                        email: pendingUser.email,
                        password_hash: pendingUser.password_hash,
                        full_name: pendingUser.full_name,
                        organization_id: targetOrgId,
                        role: assignedRole
                    }
                });

                await tx.organizationMember.create({
                    data: { organization_id: targetOrgId, user_id: newUser.id, role: 'member' }
                });

                await tx.teamMember.create({
                    data: { project_id: invitation.project_id, user_id: newUser.id, role: invitation.role }
                });

                await tx.invitation.update({ where: { id: invitation.id }, data: { accepted: true } });
                await tx.pendingUser.delete({ where: { id: pendingUser.id } });
                return newUser;
            }

            // High Safety Domain Extraction to prevent db crashes
            const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
            const emailParts = pendingUser.email.split('@');
            const domain = emailParts.length > 1 ? emailParts[1].toLowerCase() : 'unknown-domain.com';

            if (!publicDomains.includes(domain)) {
                // Ensure slug is 100% URL safe to prevent Prisma unique constraint errors
                const safeDomainSlug = domain.replace(/[^a-zA-Z0-9-]/g, '-');
                
                let existingOrg = await tx.organization.findFirst({
                    where: { slug: safeDomainSlug }
                });

                if (existingOrg) {
                    targetOrgId = existingOrg.id;
                    assignedRole = 'member';
                } else {
                    const newOrg = await tx.organization.create({
                        data: { name: `${domain} Workspace`, slug: safeDomainSlug }
                    });
                    targetOrgId = newOrg.id;
                }
            } else {
                const uniqueSuffix = crypto.randomBytes(4).toString('hex');
                const safeName = pendingUser.full_name ? pendingUser.full_name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'user';
                const newOrg = await tx.organization.create({
                    data: {
                        name: `${pendingUser.full_name || 'My'} Workspace`,
                        slug: `${safeName}-${uniqueSuffix}-${Date.now()}`
                    }
                });
                targetOrgId = newOrg.id;
            }

            const newUser = await tx.user.create({
                data: {
                    email: pendingUser.email,
                    password_hash: pendingUser.password_hash,
                    full_name: pendingUser.full_name,
                    organization_id: targetOrgId,
                    role: assignedRole
                }
            });

            await tx.organizationMember.create({
                data: { organization_id: targetOrgId, user_id: newUser.id, role: assignedRole }
            });

            await tx.pendingUser.delete({ where: { id: pendingUser.id } });
            return newUser;
        });

        const organization = await prisma.organization.findUnique({ where: { id: user.organization_id } });
        const payload = { userId: user.id, email: user.email, role: user.role, organizationId: user.organization_id };
        
        return {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                organization_id: user.organization_id,
                organization: organization ? { id: organization.id, name: organization.name, slug: organization.slug } : null
            },
            token: signAccessToken(payload),
            refresh_token: signRefreshToken(payload),
        };
    }

    async login(data: SigninUser) {
        const user = await prisma.user.findFirst({
            where: { email: data.email },
        });

        if (!user || !user.password_hash) {
            // Spend comparable time so response latency does not reveal whether the account exists
            await bcrypt.compare(data.password, DUMMY_HASH);
            throw new Error('Invalid credentials');
        }

        const validPassword = await bcrypt.compare(data.password, user.password_hash);
        if (!validPassword) {
            throw new Error('Invalid credentials');
        }

        const payload = { userId: user.id, email: user.email, role: user.role, organizationId: user.organization_id };
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        logger.info(`User logged in: ${user.id}`);

        const organization = await prisma.organization.findUnique({
            where: { id: user.organization_id }
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                avatar_url: user.avatar_url,
                organization_id: user.organization_id,
                organization: organization
                    ? { id: organization.id, name: organization.name, slug: organization.slug }
                    : null
            },
            token: accessToken,
            refresh_token: refreshToken,
        };
    }

    async refresh(token: string) {
        const payload = verifyRefreshToken(token);
        if (!payload) {
            throw new Error('Invalid refresh token');
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) {
            throw new Error('User not found');
        }

        const newPayload = { userId: user.id, email: user.email, role: user.role, organizationId: user.organization_id };
        const newAccessToken = signAccessToken(newPayload);
        const newRefreshToken = signRefreshToken(newPayload);

        return {
            token: newAccessToken,
            refresh_token: newRefreshToken,
        };
    }

    async demoLogin() {
        const demoEmail = 'demo@realtimecollaborator.com';
        
        await seedDemoWorkspace(prisma);
        
        const user = await prisma.user.findUnique({
            where: { email: demoEmail },
        });

        if (!user) {
            throw new Error('Demo user creation failed');
        }

        const payload = { userId: user.id, email: user.email, role: user.role, organizationId: user.organization_id };
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        logger.info(`Demo user logged in: ${user.id}`);

        const organization = await prisma.organization.findUnique({
            where: { id: user.organization_id }
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                avatar_url: user.avatar_url,
                organization_id: user.organization_id,
                organization: organization
                    ? { id: organization.id, name: organization.name, slug: organization.slug }
                    : null
            },
            token: accessToken,
            refresh_token: refreshToken,
        };
    }
}