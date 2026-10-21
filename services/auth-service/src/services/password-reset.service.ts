import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getPrismaClient } from '@collab/database';
// @ts-ignore - Local module resolution
import { createLogger } from '@packages/logger';

const prisma = getPrismaClient();
const logger = createLogger('auth-service');

export class PasswordResetService {
    async requestPasswordReset(email: string) {
        logger.info(`[PasswordResetService] requestPasswordReset: Request for ${email}`);
        
        const user = await prisma.user.findFirst({
            where: { email },
        });

        if (!user) {
            // Don't reveal if email exists or not for security
            logger.info(`[PasswordResetService] requestPasswordReset: Email not found ${email}`);
            return {
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent.'
            };
        }

        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiry

        // Delete any existing reset tokens for this email
        await prisma.passwordResetToken.deleteMany({
            where: { email }
        });

        // Store new reset token
        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expires_at: expiresAt
            }
        });

        const resetUrl = `http://localhost:3000/auth/reset-password?token=${token}`;
        logger.info(`\n\n======================================================`);
        logger.info(`[ACTION REQUIRED] MOCK PASSWORD RESET LINK GENERATED`);
        logger.info(`Send this to: ${email}`);
        logger.info(`Link: ${resetUrl}`);
        logger.info(`======================================================\n\n`);

        return {
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        };
    }

    async resetPassword(token: string, newPassword: string) {
        logger.info(`[PasswordResetService] resetPassword: Attempting password reset`);
        
        if (typeof token !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
            throw new Error('Password must be between 8 and 128 characters');
        }

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token }
        });

        if (!resetToken) {
            throw new Error('Invalid or expired reset token');
        }

        if (resetToken.expires_at < new Date()) {
            await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
            throw new Error('Reset token has expired. Please request a new password reset.');
        }

        const user = await prisma.user.findFirst({
            where: { email: resetToken.email }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await prisma.user.update({
            where: { id: user.id },
            data: { password_hash: hashedPassword }
        });

        // Tokens are single use: remove this one and any other outstanding token for the account
        await prisma.passwordResetToken.deleteMany({ where: { email: resetToken.email } });

        logger.info(`[PasswordResetService] resetPassword: Password reset successful for ${user.email}`);

        return {
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        };
    }
}
