import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import apiRouter from './routes';
import { pool } from './db';

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 挂载主路由
app.use('/api', apiRouter);

// 托管前端构建产物
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA 回退处理 (兼容 Express 5)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.resolve(distPath, 'index.html'));
    }
    next();
  });
}

// 全局 404
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null });
});

// 全局异常处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Unhandled Error]:', err);
  res.status(500).json({
    code: 500,
    message: err.message || '服务器内部异常',
    data: null
  });
});

const server = app.listen(config.port, () => {
  console.log(`[SysOne GX Backend] listening on http://localhost:${config.port}`);
});

process.on('SIGTERM', () => {
  console.log('[SysOne GX Backend] SIGTERM received, closing...');
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});

export default app;
