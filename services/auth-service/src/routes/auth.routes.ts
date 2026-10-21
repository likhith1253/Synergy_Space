import { Router } from 'express';
// @ts-ignore - Local module resolution
import { AuthController } from '../controllers/auth.controller';
import { registerRateLimiter, authRateLimiter, demoRateLimiter, accountRateLimiter } from '../middleware/rate-limit.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/register', registerRateLimiter, authController.register);
router.post('/verify-email', authRateLimiter, authController.verifyEmail);
router.post('/login', authRateLimiter, accountRateLimiter, authController.login);
router.post('/demo-login', demoRateLimiter, authController.demoLogin);
router.post('/refresh', authRateLimiter, authController.refresh);

router.get('/me', authRateLimiter, authenticate, authController.getMe);
router.put('/profile', authRateLimiter, authenticate, authController.updateProfile);

export default router;