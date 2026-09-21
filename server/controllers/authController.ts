import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { username, email, password, nickname } = req.body;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await AuthService.register({
        username,
        email,
        password,
        nickname,
        ip,
        userAgent
      });

      res.status(200).json({
        code: 200,
        message: '注册成功并已自动登录',
        data: result
      });
    } catch (err: any) {
      res.status(400).json({
        code: 400,
        message: err.message || '注册失败',
        data: null
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { account, password } = req.body;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await AuthService.login({
        account,
        password,
        ip,
        userAgent
      });

      res.status(200).json({
        code: 200,
        message: '登录成功',
        data: result
      });
    } catch (err: any) {
      res.status(400).json({
        code: 400,
        message: err.message || '登录失败',
        data: null
      });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ code: 401, message: '未登录', data: null });
        return;
      }
      const userInfo = await AuthService.getCurrentUser(req.user.id);
      res.status(200).json({
        code: 200,
        message: '获取成功',
        data: userInfo
      });
    } catch (err: any) {
      res.status(500).json({
        code: 500,
        message: err.message || '获取用户信息异常',
        data: null
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    try {
      await AuthService.logout(req.user?.sessionId);
      res.status(200).json({
        code: 200,
        message: '已成功安全注销',
        data: true
      });
    } catch (err: any) {
      res.status(500).json({
        code: 500,
        message: err.message || '注销失败',
        data: null
      });
    }
  }
}
