import { Router } from 'express';
import { createChat, getChats, updateChat, deleteChat } from '../controllers/chatController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/', protect as any, createChat as any);
router.get('/', protect as any, getChats as any);
router.put('/:id', protect as any, updateChat as any);
router.delete('/:id', protect as any, deleteChat as any);

export default router;
