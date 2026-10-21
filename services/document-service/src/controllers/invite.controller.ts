import { Request, Response } from 'express';
// @ts-ignore
import { PrismaClient } from '@collab/database';
import { EmailService } from '../services/email.service';
import crypto from 'crypto';
import { isTeamRole } from '@collab/database';

const prisma = new PrismaClient();
const emailService = new EmailService();

export class InviteController {
    async createInvite(req: Request, res: Response) {
        try {
            const { projectId } = req.params;
            const { email, role = 'viewer' } = req.body;
            if (typeof email !== 'string' || !isTeamRole(role)) {
                res.status(400).json({ error: 'A valid email and a role of admin, editor or viewer are required' });
                return;
            }
            // User ID from auth middleware
            // @ts-ignore
            const userId = req.user?.userId;

            if (!email) {
                res.status(400).json({ error: 'Email is required' });
                return;
            }

            // 1. Check if project exists and user is owner
            const project = await prisma.project.findUnique({
                where: { id: projectId },
            });

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Verify ownership
            if (project.owner_id !== userId) {
                res.status(403).json({ error: 'Only the project owner can invite members' });
                return;
            }

            // 2. Check if user is already a member
            const userToCheck = await prisma.user.findUnique({ where: { email } });
            if (userToCheck) {
                const existingMember = await prisma.teamMember.findFirst({
                    where: {
                        project_id: projectId,
                        user_id: userToCheck.id,
                    },
                });

                if (existingMember) {
                    res.status(400).json({ error: 'User is already a team member' });
                    return;
                }
            }

            // 3. Create Invitation
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry

            // Upsert invitation (update if already exists for this email/project)
            // But schema says token is unique index... so we should create new or delete old?
            // Let's just create new. Schema allows multiple invitations? No, unique constraint on token.
            // But (project_id, email) is not unique in DB?
            // Actually, let's delete any existing pending invites for this email/project to avoid clutter
            await prisma.invitation.deleteMany({
                where: {
                    project_id: projectId,
                    email: email,
                }
            });

            const invitation = await prisma.invitation.create({
                data: {
                    project_id: projectId,
                    email,
                    role,
                    token,
                    expires_at: expiresAt,
                },
            });

            // 4. Send Email
            // Construct Link: /auth/sign-up?inviteToken=...
            // We need the frontend URL. Env var?
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const inviteLink = `${frontendUrl}/auth/sign-up?inviteToken=${token}`;

            await emailService.sendInviteEmail(email, inviteLink, project.name);

            res.status(201).json({ message: 'Invitation sent', invitationId: invitation.id });

        } catch (error: any) {
            console.error('Create Invite Error:', error);
            res.status(500).json({ error: 'Failed to create invitation' });
        }
    }

    async getInvite(req: Request, res: Response) {
        try {
            const { token } = req.params;

            const invitation = await prisma.invitation.findUnique({
                where: { token },
                include: {
                    project: {
                        select: { name: true, description: true, owner: { select: { full_name: true } } }
                    }
                }
            });

            if (!invitation) {
                res.status(404).json({ error: 'Invitation not found' });
                return;
            }

            if (invitation.expires_at < new Date()) {
                res.status(410).json({ error: 'Invitation expired' });
                return;
            }

            if (invitation.accepted) {
                res.status(400).json({ error: 'Invitation already accepted' });
                return;
            }

            res.status(200).json({
                email: invitation.email,
                project: invitation.project,
                role: invitation.role
            });

        } catch (error: any) {
            console.error('Get Invite Error:', error);
            res.status(500).json({ error: 'Failed to fetch invitation' });
        }
    }
}