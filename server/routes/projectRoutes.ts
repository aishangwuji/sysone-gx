import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// 项目接口全部受到登录会话保护
router.use(requireAuth);

router.post('/', ProjectController.create);
router.get('/', ProjectController.list);
router.get('/:id', ProjectController.getById);
router.put('/:id', ProjectController.update);
router.delete('/:id', ProjectController.delete);

export default router;
