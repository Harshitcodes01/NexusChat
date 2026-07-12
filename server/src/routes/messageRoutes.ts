import { Router } from 'express';
import { sendMessage, getMessages, editMessage, deleteMessage } from '../controllers/messageController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/', protect as any, sendMessage as any);
router.get('/:chatId', protect as any, getMessages as any);
router.put('/:id', protect as any, editMessage as any);
router.delete('/:id', protect as any, deleteMessage as any);

export default router;
