import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db';
import { config } from '../config';
import { hashToken } from '../middleware/auth';

export class AuthService {
  /**
   * 用户注册逻辑
   */
  static async register(params: {
    username: string;
    email: string;
    password: string;
    nickname?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { username, email, password, nickname, ip, userAgent } = params;

    // 参数基础校验
    if (!username || username.trim().length < 3) {
      throw new Error('用户名长度不能少于 3 个字符');
    }
    if (!email || !email.includes('@')) {
      throw new Error('请输入有效的电子邮箱地址');
    }
    if (!password || password.length < 6) {
      throw new Error('密码长度不能少于 6 个字符');
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // 检查用户名是否重复 (未删除用户)
    const existUserRes = await query(
      `SELECT id FROM sysone_users WHERE username = $1 AND is_deleted = FALSE LIMIT 1`,
      [cleanUsername]
    );
    if (existUserRes.rows.length > 0) {
      throw new Error('该用户名已被注册，请更换其他用户名');
    }

    // 检查邮箱是否重复
    const existEmailRes = await query(
      `SELECT id FROM sysone_users WHERE email = $1 AND is_deleted = FALSE LIMIT 1`,
      [cleanEmail]
    );
    if (existEmailRes.rows.length > 0) {
      throw new Error('该电子邮箱已被绑定，请更换其他邮箱');
    }

    // 密码加盐散列加密
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = 'usr_' + crypto.randomBytes(12).toString('hex');
    const userNickname = (nickname && nickname.trim()) || username;

    // 写入新用户
    await query(
      `INSERT INTO sysone_users (
        id, username, email, password_hash, nickname, status,
        last_login_at, last_login_ip, created_at, updated_at, is_deleted
      ) VALUES ($1, $2, $3, $4, $5, 1, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, FALSE)`,
      [userId, cleanUsername, cleanEmail, passwordHash, userNickname, ip || '']
    );

    // 为新用户自动初始化一个空白项目
    const defaultProjectId = 'proj_' + crypto.randomBytes(12).toString('hex');
    const defaultWorkflowData = {
      nodes: [],
      edges: []
    };

    await query(
      `INSERT INTO sysone_projects (
        id, user_id, name, description, icon, workflow_data, template_type,
        version, is_active, created_at, updated_at, created_by, updated_by, is_deleted
      ) VALUES ($1, $2, $3, $4, 'FolderKanban', $5, 'custom', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $2, $2, FALSE)`,
      [
        defaultProjectId,
        userId,
        '我的项目',
        '',
        JSON.stringify(defaultWorkflowData)
      ]
    );

    // 签发会话与 Token
    const sessionId = 'ses_' + crypto.randomBytes(12).toString('hex');
    const jwtToken = jwt.sign(
      { userId, username: cleanUsername, sessionId },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    const tokenH = hashToken(jwtToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7天过期

    await query(
      `INSERT INTO sysone_user_sessions (
        id, user_id, token_hash, ip_address, user_agent, expires_at,
        last_active_at, is_revoked, created_at, updated_at, is_deleted
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, FALSE)`,
      [sessionId, userId, tokenH, ip || '', userAgent || '', expiresAt]
    );

    return {
      user: {
        id: userId,
        username: cleanUsername,
        email: cleanEmail,
        nickname: userNickname,
        avatar: ''
      },
      token: jwtToken,
      defaultProjectId
    };
  }

  /**
   * 用户登录逻辑
   */
  static async login(params: {
    account: string;
    password: string;
    ip?: string;
    userAgent?: string;
  }) {
    const { account, password, ip, userAgent } = params;

    if (!account || !password) {
      throw new Error('请输入账号与密码');
    }

    const cleanAccount = account.trim().toLowerCase();

    // 支持用户名或邮箱登录
    const userRes = await query(
      `SELECT id, username, email, password_hash, nickname, avatar, status
       FROM sysone_users
       WHERE (username = $1 OR email = $1) AND is_deleted = FALSE
       LIMIT 1`,
      [cleanAccount]
    );

    if (userRes.rows.length === 0) {
      throw new Error('账号或密码不正确');
    }

    const user = userRes.rows[0];

    if (user.status !== 1) {
      throw new Error('该账号已被冻结或禁用，请联系管理员');
    }

    // 校验密码
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('账号或密码不正确');
    }

    // 更新最近登录信息
    await query(
      `UPDATE sysone_users
       SET last_login_at = CURRENT_TIMESTAMP,
           last_login_ip = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [user.id, ip || '']
    );

    // 签发新会话
    const sessionId = 'ses_' + crypto.randomBytes(12).toString('hex');
    const jwtToken = jwt.sign(
      { userId: user.id, username: user.username, sessionId },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    const tokenH = hashToken(jwtToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    await query(
      `INSERT INTO sysone_user_sessions (
        id, user_id, token_hash, ip_address, user_agent, expires_at,
        last_active_at, is_revoked, created_at, updated_at, is_deleted
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, FALSE)`,
      [sessionId, user.id, tokenH, ip || '', userAgent || '', expiresAt]
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname || user.username,
        avatar: user.avatar || ''
      },
      token: jwtToken
    };
  }

  /**
   * 获取当前登录用户信息
   */
  static async getCurrentUser(userId: string) {
    const userRes = await query(
      `SELECT id, username, email, nickname, avatar, status, created_at, last_login_at
       FROM sysone_users
       WHERE id = $1 AND is_deleted = FALSE
       LIMIT 1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new Error('用户不存在或已注销');
    }

    const u = userRes.rows[0];
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      nickname: u.nickname || u.username,
      avatar: u.avatar || '',
      status: u.status,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at
    };
  }

  /**
   * 登出注销会话
   */
  static async logout(sessionId?: string) {
    if (!sessionId) return true;
    await query(
      `UPDATE sysone_user_sessions
       SET is_revoked = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [sessionId]
    );
    return true;
  }
}
