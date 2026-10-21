import { Request, Response } from 'express';
// @ts-ignore - Local module resolution
import { AuthService } from '../services/auth.service';
import { getPrismaClient } from '@collab/database';
// @ts-ignore - Local module resolution
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '@packages/types';

const authService = new AuthService();
const prisma = getPrismaClient();

export class AuthController {
    async register(req: Request, res: Response) {
        try {
            const validatedData = RegisterSchema.parse(req.body);
            const result = await authService.register(validatedData);
            res.status(201).json(result);
        } catch (error: any) {
            if (error.name === 'ZodError') {
                res.status(400).json({ error: error.errors });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    }

    async verifyEmail(req: Request, res: Response) {
        try {
            const { token } = req.body;
            if (!token) {
                res.status(400).json({ error: 'Token is required' });
                return;
            }
            const result = await authService.verifyEmail(token);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const validatedData = LoginSchema.parse(req.body);
            const result = await authService.login(validatedData);
            res.status(200).json(result);
        } catch (error: any) {
            if (error.name === 'ZodError') {
                res.status(400).json({ error: error.errors });
            } else {
                res.status(401).json({ error: error.message });
            }
        }
    }

    async demoLogin(req: Request, res: Response) {
        try {
            if (process.env.ENABLE_DEMO_MODE !== 'true') {
                res.status(403).json({ error: 'Demo mode is disabled via feature flag.' });
                return;
            }
            const result = await authService.demoLogin();
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: 'Demo login failed' });
        }
    }

    async refresh(req: Request, res: Response) {
        try {
            const validatedData = RefreshTokenSchema.parse(req.body);
            const result = await authService.refresh(validatedData.refresh_token);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    }

    async getMe(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }
            const dbUser = await prisma.user.findUnique({
                where: { id: user.userId },
                include: { organization: true }
            });

            if (!dbUser) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            res.status(200).json({
                id: dbUser.id,
                email: dbUser.email,
                full_name: dbUser.full_name,
                role: dbUser.role,
                avatar_url: dbUser.avatar_url,
                organization_id: dbUser.organization_id,
                organization: dbUser.organization
                    ? { id: dbUser.organization.id, name: dbUser.organization.name, slug: dbUser.organization.slug }
                    : null,
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateProfile(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) {
                res.status(401).json({ error: 'Not authenticated' });
                return;
            }

            const dbUserBefore = await prisma.user.findUnique({ where: { id: user.userId } });
            if (dbUserBefore?.email === 'demo@realtimecollaborator.com') {
                res.status(403).json({ error: 'The profile of the Demo Account is protected and cannot be updated.' });
                return;
            }

            const { full_name, avatar_url } = req.body;

            if (!full_name && avatar_url === undefined) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }

            const updateData: { full_name?: string; avatar_url?: string } = {};
            if (full_name) updateData.full_name = full_name;
            if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

            const updatedUser = await prisma.user.update({
                where: { id: user.userId },
                data: updateData,
                include: { organization: true }
            });

            res.status(200).json({
                id: updatedUser.id,
                email: updatedUser.email,
                full_name: updatedUser.full_name,
                role: updatedUser.role,
                avatar_url: updatedUser.avatar_url,
                organization_id: updatedUser.organization_id,
                organization: updatedUser.organization
                    ? { id: updatedUser.organization.id, name: updatedUser.organization.name, slug: updatedUser.organization.slug }
                    : null,
            });
        } catch (error: any) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}