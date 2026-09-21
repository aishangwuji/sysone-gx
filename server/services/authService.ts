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

    // 为新用户自动初始化一个默认的“智能客服分流决策树”示例项目
    const defaultProjectId = 'proj_' + crypto.randomBytes(12).toString('hex');
    const defaultWorkflowData = {
      nodes: [
        {
          id: 'batch_primary',
          type: 'batchNode',
          position: { x: 250, y: 120 },
          data: {
            title: '智能客服第一级并行评估',
            model: 'jev-latest',
            enableConfidenceFallback: true,
            confidenceRange: [0.30, 0.70],
            confidenceThreshold: 0.70,
            questions: [
              {
                id: 'department',
                type: 'choice',
                instructions: '根据客户的诉求和问题描述，将工单精准分流至专门职能部门。',
                criteria: {
                  returns: { what: '退换货申请、退款退货政策咨询、尺寸不合要求换货' },
                  shipping: { what: '包裹物流轨迹、清关进度、快递派送延迟' },
                  billing: { what: '扣款疑问、发票开具申请、支付方式咨询' },
                  other: { what: '无法归入上述类别的通用咨询' }
                }
              },
              {
                id: 'frustration',
                type: 'score',
                instructions: '评估客户在沟通文本中表达出的受挫和愤怒程度。',
                criteria: [
                  { level: 0, what: '情绪平和友善，正常提出业务咨询。' },
                  { level: 1, what: '略显焦急但保持克制礼貌。' },
                  { level: 2, what: '言辞激烈，带有强烈不满、警告或投诉要求。' }
                ]
              }
            ]
          }
        },
        {
          id: 'act_returns',
          type: 'actionNode',
          position: { x: 50, y: 450 },
          data: {
            title: '触发售后退换货流程',
            actionType: 'webhook',
            config: { endpoint: 'https://api.internal/returns/triage' }
          }
        },
        {
          id: 'act_shipping',
          type: 'actionNode',
          position: { x: 300, y: 450 },
          data: {
            title: '查询物流中台最新动态',
            actionType: 'database_update',
            config: { status: 'shipping_inquiry' }
          }
        },
        {
          id: 'act_supervisor',
          type: 'actionNode',
          position: { x: 550, y: 450 },
          data: {
            title: '转交高级主管人工通道',
            actionType: 'human_review',
            config: { team: 'Supervisor-Tier3' }
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'batch_primary',
          sourceHandle: 'q_department_returns',
          target: 'act_returns'
        },
        {
          id: 'e2',
          source: 'batch_primary',
          sourceHandle: 'q_department_shipping',
          target: 'act_shipping'
        },
        {
          id: 'e3',
          source: 'batch_primary',
          sourceHandle: 'fallback_handle',
          target: 'act_supervisor'
        }
      ]
    };

    await query(
      `INSERT INTO sysone_projects (
        id, user_id, name, description, icon, workflow_data, template_type,
        version, is_active, created_at, updated_at, created_by, updated_by, is_deleted
      ) VALUES ($1, $2, $3, $4, 'FolderKanban', $5, 'support_triage', 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $2, $2, FALSE)`,
      [
        defaultProjectId,
        userId,
        '智能客服工单决策流 (示例)',
        '系统自动创建的入门决策流示例，展示多问题并行批处理与置信度兜底能力。',
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
