/**
 * Team Controller
 * Request handlers for team endpoints
 */

import { Request, Response } from 'express';
import * as teamService from '../services/team.service';
import { ValidationError } from '../utils/errors';

/**
 * GET /projects/:projectId/team
 */
export async function getProjectTeam(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    const userId = req.user!.userId;

    if (!projectId) {
        throw new ValidationError('Project ID is required');
    }

    const team = await teamService.getProjectTeam(projectId, userId);
    res.status(200).json(team);
}

/**
 * POST /projects/:projectId/team
 * Add a member to the team
 */
export async function addTeamMember(req: Request, res: Response): Promise<void> {
    const { projectId } = req.params;
    const { email, role } = req.body;
    const userId = req.user!.userId;

    if (!projectId) {
        throw new ValidationError('Project ID is required');
    }
    if (!email) {
        throw new ValidationError('Email is required');
    }

    const member = await teamService.addTeamMember(projectId, email, role, userId);
    res.status(201).json(member);
}

/**
 * DELETE /projects/:projectId/team/:userId
 * Remove a member from the team
 */
export async function removeTeamMember(req: Request, res: Response): Promise<void> {
    const { projectId, userId: targetUserId } = req.params;
    const currentUserId = req.user!.userId;

    if (!projectId) {
        throw new ValidationError('Project ID is required');
    }
    if (!targetUserId) {
        throw new ValidationError('Target User ID is required');
    }

    const result = await teamService.removeTeamMember(projectId, targetUserId, currentUserId);
    res.status(200).json(result);
}
