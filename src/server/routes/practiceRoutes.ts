import { Router } from 'express';
import { PracticeController } from '../controllers/practiceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/:kitId/record', PracticeController.recordCardReview);
router.get('/:kitId/queue', PracticeController.getPracticeQueue);

export default router;
