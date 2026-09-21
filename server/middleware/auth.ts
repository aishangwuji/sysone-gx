import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { query } from '../db';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  nickname: string;
  sessionId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  token?: string;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token + config.sessionSalt).digest('hex');
}

/**
 * 统一认证中间件：提取 Bearer Token 并校验数据库会话
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 401,
      message: '请先登录后再进行操作',
      data: null
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      code: 401,
      message: '认证凭证无效',
      data: null
    });
    return;
  }

  try {
    jwt.verify(token, config.jwtSecret);

    // 查询会话有效性 (未吊销、未软删除、未过期)
    const tokenH = hashToken(token);
    const sessionRes = await query(
      `SELECT s.id, s.user_id, s.expires_at, s.is_revoked,
              u.username, u.email, u.nickname, u.status
       FROM sysone_user_sessions s
       JOIN sysone_users u ON s.user_id = u.id
       WHERE s.token_hash = $1
         AND s.is_deleted = FALSE
         AND s.is_revoked = FALSE
         AND u.is_deleted = FALSE
       LIMIT 1`,
      [tokenH]
    );

    if (sessionRes.rows.length === 0) {
      res.status(401).json({
        code: 401,
        message: '登录会话已失效或已在其他终端注销，请重新登录',
        data: null
      });
      return;
    }

    const row = sessionRes.rows[0];

    // 检查账号状态
    if (row.status !== 1) {
      res.status(403).json({
        code: 403,
        message: '该账号已被冻结或禁用',
        data: null
      });
      return;
    }

    // 检查过期时间
    if (new Date(row.expires_at) < new Date()) {
      res.status(401).json({
        code: 401,
        message: '登录已过期，请重新登录',
        data: null
      });
      return;
    }

    // 异步更新活跃时间戳
    query(
      `UPDATE sysone_user_sessions
       SET last_active_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [row.id]
    ).catch((err) => console.error('[Update session active time error]:', err.message));

    req.user = {
      id: row.user_id,
      username: row.username,
      email: row.email,
      nickname: row.nickname || row.username,
      sessionId: row.id
    };
    req.token = token;

    next();
  } catch (err: any) {
    res.status(401).json({
      code: 401,
      message: '凭证校验失败: ' + (err.message || 'Token 无效'),
      data: null
    });
  }
}
