import crypto from 'crypto';
import { query } from '../db';
import { ProjectWorkflowData } from '../types';

export class ProjectService {
  /**
   * 新建决策流项目 (严格与账号绑定)
   */
  static async createProject(
    userId: string,
    params: {
      name: string;
      description?: string;
      icon?: string;
      templateType?: string;
      workflowData?: ProjectWorkflowData;
    }
  ) {
    const { name, description, icon, templateType, workflowData } = params;

    if (!name || !name.trim()) {
      throw new Error('项目名称不能为空');
    }

    const projectId = 'proj_' + crypto.randomBytes(12).toString('hex');
    const projectIcon = icon || 'FolderKanban';
    const initialTemplate = templateType || 'custom';

    // 默认空画布或传入的工作流数据
    const dataToSave: ProjectWorkflowData = workflowData || {
      nodes: [
        {
          id: 'batch_root',
          type: 'batchNode',
          position: { x: 250, y: 150 },
          data: {
            title: name.trim() + ' 根评估批处理',
            model: 'jev-latest',
            enableConfidenceFallback: true,
            confidenceRange: [0.30, 0.70],
            confidenceThreshold: 0.70,
            questions: [
              {
                id: 'primary_intent',
                type: 'choice',
                instructions: '分析输入文本的核心业务意图分类。',
                criteria: {
                  inquiry: { what: '常规业务咨询' },
                  complaint: { what: '投诉与差评反馈' }
                }
              }
            ]
          }
        }
      ],
      edges: []
    };

    const sql = `
      INSERT INTO sysone_projects (
        id, user_id, name, description, icon, workflow_data,
        template_type, version, is_active, created_at, updated_at,
        created_by, updated_by, is_deleted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $2, $2, FALSE)
      RETURNING id, user_id, name, description, icon, template_type, version, is_active, created_at, updated_at
    `;

    const res = await query(sql, [
      projectId,
      userId,
      name.trim(),
      (description && description.trim()) || '',
      projectIcon,
      JSON.stringify(dataToSave),
      initialTemplate
    ]);

    const created = res.rows[0];
    return {
      ...created,
      workflowData: dataToSave
    };
  }

  /**
   * 获取当前用户的所有有效项目列表 (严格软删除与归属过滤)
   */
  static async listUserProjects(userId: string) {
    const sql = `
      SELECT
        id,
        user_id,
        name,
        description,
        icon,
        template_type,
        version,
        is_active,
        created_at,
        updated_at,
        jsonb_array_length(COALESCE(workflow_data->'nodes', '[]'::jsonb)) as node_count,
        jsonb_array_length(COALESCE(workflow_data->'edges', '[]'::jsonb)) as edge_count
      FROM sysone_projects
      WHERE user_id = $1 AND is_deleted = FALSE
      ORDER BY updated_at DESC
    `;

    const res = await query(sql, [userId]);
    return res.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      templateType: row.template_type,
      version: row.version,
      isActive: row.is_active,
      nodeCount: parseInt(row.node_count, 10) || 0,
      edgeCount: parseInt(row.edge_count, 10) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * 获取指定项目的完整详情与画布工作流图
   */
  static async getProjectById(userId: string, projectId: string) {
    const sql = `
      SELECT
        id,
        user_id,
        name,
        description,
        icon,
        workflow_data,
        template_type,
        version,
        is_active,
        created_at,
        updated_at
      FROM sysone_projects
      WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
      LIMIT 1
    `;

    const res = await query(sql, [projectId, userId]);
    if (res.rows.length === 0) {
      throw new Error('未找到该项目或您无权访问');
    }

    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      workflowData: row.workflow_data,
      templateType: row.template_type,
      version: row.version,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * 保存更新项目 (自动递增版本号与更新审计人)
   */
  static async updateProject(
    userId: string,
    projectId: string,
    params: {
      name?: string;
      description?: string;
      icon?: string;
      workflowData?: ProjectWorkflowData;
    }
  ) {
    const { name, description, icon, workflowData } = params;

    // 先检查归属
    const checkRes = await query(
      `SELECT id, version FROM sysone_projects WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE LIMIT 1`,
      [projectId, userId]
    );

    if (checkRes.rows.length === 0) {
      throw new Error('项目不存在或已被删除');
    }

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP', 'updated_by = $2', 'version = version + 1'];
    const values: any[] = [projectId, userId];
    let paramIdx = 3;

    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIdx++}`);
      values.push(description.trim());
    }
    if (icon !== undefined) {
      updates.push(`icon = $${paramIdx++}`);
      values.push(icon.trim());
    }
    if (workflowData !== undefined) {
      updates.push(`workflow_data = $${paramIdx++}::jsonb`);
      values.push(JSON.stringify(workflowData));
    }

    const sql = `
      UPDATE sysone_projects
      SET ${updates.join(', ')}
      WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
      RETURNING id, name, description, icon, version, updated_at
    `;

    const res = await query(sql, values);
    return res.rows[0];
  }

  /**
   * 软删除项目 (规范 2)
   */
  static async deleteProject(userId: string, projectId: string) {
    const sql = `
      UPDATE sysone_projects
      SET is_deleted = TRUE,
          deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $2
      WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
    `;

    const res = await query(sql, [projectId, userId]);
    if ((res.rowCount ?? 0) === 0) {
      throw new Error('项目不存在或已被删除');
    }
    return true;
  }
}
