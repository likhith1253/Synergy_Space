import { Router } from 'express';
// @ts-ignore - Local module resolution
import { PasswordResetController } from '../controllers/password-reset.controller';
import { authRateLimiter, accountRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
const passwordResetController = new PasswordResetController();

router.post('/request-reset', authRateLimiter, accountRateLimiter, passwordResetController.requestPasswordReset);
router.post('/reset', authRateLimiter, accountRateLimiter, passwordResetController.resetPassword);

export default router;
