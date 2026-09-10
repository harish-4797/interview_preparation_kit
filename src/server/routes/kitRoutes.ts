import { Router } from 'express';
import { KitController } from '../controllers/kitController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All kit routes are protected
router.use(authMiddleware);

router.post('/generate', KitController.generateKit);
router.get('/', KitController.listKits);
router.get('/:id', KitController.getKit);
router.put('/:id', KitController.updateKit);
router.post('/:id/regenerate-section', KitController.regenerateSection);
router.delete('/:id', KitController.deleteKit);
router.post('/:id/mock-interview', KitController.evaluateMockAnswer);

export default router;
