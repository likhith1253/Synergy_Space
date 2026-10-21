import { Request, Response } from 'express';
// @ts-ignore - Local module resolution
import { PasswordResetService } from '../services/password-reset.service';

const passwordResetService = new PasswordResetService();

export class PasswordResetController {
    async requestPasswordReset(req: Request, res: Response) {
        try {
            const { email } = req.body;
            if (!email || typeof email !== 'string') {
                res.status(400).json({ error: 'Email is required' });
                return;
            }
            const result = await passwordResetService.requestPasswordReset(email);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ error: 'Failed to process password reset request' });
        }
    }

    async resetPassword(req: Request, res: Response) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                res.status(400).json({ error: 'Token and new password are required' });
                return;
            }
            const result = await passwordResetService.resetPassword(token, newPassword);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
