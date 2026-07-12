import { Router } from 'express';
import { getUsers, updateProfile } from '../controllers/userController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect as any, getUsers as any);
router.put('/profile', protect as any, updateProfile as any);

export default router;
