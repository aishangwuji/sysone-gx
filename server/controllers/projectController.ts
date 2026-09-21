import { Response } from 'express';
import { ProjectService } from '../services/projectService';
import { AuthenticatedRequest } from '../middleware/auth';

export class ProjectController {
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { name, description, icon, templateType, workflowData } = req.body;

      const project = await ProjectService.createProject(userId, {
        name,
        description,
        icon,
        templateType,
        workflowData
      });

      res.status(200).json({
        code: 200,
        message: '项目创建成功',
        data: project
      });
    } catch (err: any) {
      res.status(400).json({
        code: 400,
        message: err.message || '项目创建失败',
        data: null
      });
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const projects = await ProjectService.listUserProjects(userId);

      res.status(200).json({
        code: 200,
        message: '获取项目列表成功',
        data: projects
      });
    } catch (err: any) {
      res.status(500).json({
        code: 500,
        message: err.message || '获取项目列表异常',
        data: null
      });
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const projectId = req.params.id as string;

      const project = await ProjectService.getProjectById(userId, projectId);

      res.status(200).json({
        code: 200,
        message: '获取项目详情成功',
        data: project
      });
    } catch (err: any) {
      res.status(404).json({
        code: 404,
        message: err.message || '未找到该项目',
        data: null
      });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const projectId = req.params.id as string;
      const { name, description, icon, workflowData } = req.body;

      const updated = await ProjectService.updateProject(userId, projectId, {
        name,
        description,
        icon,
        workflowData
      });

      res.status(200).json({
        code: 200,
        message: '项目工作流保存成功',
        data: updated
      });
    } catch (err: any) {
      res.status(400).json({
        code: 400,
        message: err.message || '更新项目失败',
        data: null
      });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const projectId = req.params.id as string;

      await ProjectService.deleteProject(userId, projectId);

      res.status(200).json({
        code: 200,
        message: '项目已成功删除',
        data: true
      });
    } catch (err: any) {
      res.status(400).json({
        code: 400,
        message: err.message || '删除项目失败',
        data: null
      });
    }
  }
}
