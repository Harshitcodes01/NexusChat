import { Router } from 'express';
import {
  register,
  verifyEmail,
  verifyOTP,
  resendOTP,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, register);
router.post('/verify-email', verifyEmail);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', authRateLimiter, login);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

// Protected routes
router.post('/logout', protect as any, logout as any);
router.get('/me', protect as any, getMe as any);

export default router;
