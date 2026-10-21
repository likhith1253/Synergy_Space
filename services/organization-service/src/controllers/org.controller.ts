import { Request, Response } from 'express';
import { OrgService } from '../services/org.service';
import { CreateOrganizationSchema } from '@packages/types';
import { AuthRequest } from '../middleware/auth.middleware';

const orgService = new OrgService();

export class OrgController {
    async create(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user!.userId;
            const validatedData = CreateOrganizationSchema.parse(req.body);
            const org = await orgService.createOrganization(userId, validatedData);
            res.status(201).json(org);
        } catch (error: any) {
            if (error.name === 'ZodError') {
                res.status(400).json({ error: error.errors });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    async getOne(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user!.userId;
            // Members only; non-members get the same 404 as a missing organization
            const role = await orgService.getMemberRole(req.params.id, userId);
            const org = role ? await orgService.getOrganization(req.params.id) : null;
            if (!org) {
                return res.status(404).json({ error: 'Organization not found' });
            }
            res.json(org);
        } catch (error: any) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getMyOrgs(req: Request, res: Response) {
        try {
            const userId = (req as AuthRequest).user!.userId;
            const orgs = await orgService.getUserOrganizations(userId);
            res.json(orgs);
        } catch (error: any) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async addMember(req: Request, res: Response) {
        try {
            const { email, role = 'member' } = req.body;
            const userId = (req as AuthRequest).user!.userId;
            if (!email || typeof email !== 'string') {
                return res.status(400).json({ error: 'Email is required' });
            }
            if (!['admin', 'member'].includes(role)) {
                return res.status(400).json({ error: 'Role must be admin or member' });
            }
            const callerRole = await orgService.getMemberRole(req.params.id, userId);
            if (!callerRole) {
                return res.status(404).json({ error: 'Organization not found' });
            }
            if (!['owner', 'admin'].includes(callerRole)) {
                return res.status(403).json({ error: 'Only an organization owner or admin can add members' });
            }
            const member = await orgService.addMember(req.params.id, email, role);
            res.json(member);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
