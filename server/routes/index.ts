import { Router } from 'express';
import authRoutes from './authRoutes';
import projectRoutes from './projectRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);

// 健康检查路由
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SysOne GX Backend API', time: new Date().toISOString() });
});

export default router;
