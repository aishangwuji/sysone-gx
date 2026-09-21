/**
 * TypeSafe AI / System One 工作流模式校验器 (Schema Validator)
 * TD-2026-006: 前后端公用纯校验函数
 *
 * 核心校验规则：
 * 1. Choice: 选项数量 1 ~ 255 个 (MAX_CHOICE_OPTIONS)
 * 2. Score: 评分档位 2 ~ 10 档 (MIN_SCORE_LEVELS ~ MAX_SCORE_LEVELS) 且有序
 * 3. Noul: 概率区间校验与阈值关系 (0 <= no <= yes <= 1)
 * 4. Model: 官方支持模型白名单校验
 * 5. Structure: nodes/edges 结构完整性校验
 */

export const ALLOWED_WORKFLOW_MODELS = [
  'jev-latest',
  'jev-1.13.0',
  'typesafe/jev-1.13'
] as const;

export const MAX_CHOICE_OPTIONS = 255;
export const MIN_SCORE_LEVELS = 2;
export const MAX_SCORE_LEVELS = 10;

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateWorkflow(data: unknown): WorkflowValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['工作流数据必须是非空对象 (workflow_data must be an object)']
    };
  }

  const wf = data as Record<string, any>;

  if (!Array.isArray(wf.nodes)) {
    errors.push('workflow.nodes: 必须是节点数组 (nodes must be an array)');
  }

  if (!Array.isArray(wf.edges)) {
    errors.push('workflow.edges: 必须是连线数组 (edges must be an array)');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const nodes = wf.nodes as any[];
  const edges = wf.edges as any[];
  const nodeIds = new Set<string>();

  nodes.forEach((node, nodeIdx) => {
    const nodePrefix = `nodes[${nodeIdx}]`;
    if (!node || typeof node !== 'object') {
      errors.push(`${nodePrefix}: 节点数据结构无效`);
      return;
    }

    if (!node.id || typeof node.id !== 'string') {
      errors.push(`${nodePrefix}.id: 节点 ID 必须是非空字符串`);
    } else {
      if (nodeIds.has(node.id)) {
        errors.push(`${nodePrefix}.id: 存在重复的节点 ID "${node.id}"`);
      }
      nodeIds.add(node.id);
    }

    if (!['batchNode', 'actionNode'].includes(node.type)) {
      errors.push(`${nodePrefix}.type: 不支持的节点类型 "${node.type}"`);
    }

    if (!node.data || typeof node.data !== 'object') {
      errors.push(`${nodePrefix}.data: 节点配置数据对象不能为空`);
      return;
    }

    // 针对 batchNode 进行 TypeSafe AI 规范校验
    if (node.type === 'batchNode') {
      const bData = node.data;
      const model = bData.model || 'jev-latest';
      if (!ALLOWED_WORKFLOW_MODELS.includes(model as any)) {
        errors.push(
          `${nodePrefix}.data.model: 模型 "${model}" 不在官方支持白名单 [${ALLOWED_WORKFLOW_MODELS.join(', ')}] 中`
        );
      }

      if (!Array.isArray(bData.questions) || bData.questions.length === 0) {
        errors.push(`${nodePrefix}.data.questions: 批处理节点至少需要配置 1 个问题`);
      } else {
        bData.questions.forEach((q: any, qIdx: number) => {
          const qPrefix = `${nodePrefix}.questions[${qIdx}]`;
          if (!q || typeof q !== 'object') {
            errors.push(`${qPrefix}: 问题配置数据无效`);
            return;
          }

          if (!q.id || typeof q.id !== 'string' || !q.id.trim()) {
            errors.push(`${qPrefix}.id: 问题标识不能为空`);
          }

          if (!['choice', 'score', 'noul'].includes(q.type)) {
            errors.push(`${qPrefix}.type: 不支持的问题类型 "${q.type}"，仅允许 choice | score | noul`);
          }

          if (!q.instructions || typeof q.instructions !== 'string' || !q.instructions.trim()) {
            errors.push(`${qPrefix}.instructions: 评估指令提示不能为空`);
          }

          // Choice 类型校验
          if (q.type === 'choice') {
            if (!q.criteria || typeof q.criteria !== 'object' || Array.isArray(q.criteria)) {
              errors.push(`${qPrefix}.criteria: Choice 类型问题选项必须为键值对象`);
            } else {
              const optionKeys = Object.keys(q.criteria);
              if (optionKeys.length < 1) {
                errors.push(`${qPrefix}.criteria: Choice 至少需要 1 个选项 (当前: 0)`);
              } else if (optionKeys.length > MAX_CHOICE_OPTIONS) {
                errors.push(
                  `${qPrefix}.criteria: Choice 选项数量 (${optionKeys.length}) 超过官方限制上限 ${MAX_CHOICE_OPTIONS} 个`
                );
              }
            }
          }

          // Score 类型校验
          if (q.type === 'score') {
            if (!Array.isArray(q.criteria)) {
              errors.push(`${qPrefix}.criteria: Score 类型的评分档位必须为有序数组`);
            } else {
              if (q.criteria.length < MIN_SCORE_LEVELS) {
                errors.push(
                  `${qPrefix}.criteria: Score 至少需要 ${MIN_SCORE_LEVELS} 个评分档位 (当前: ${q.criteria.length})`
                );
              } else if (q.criteria.length > MAX_SCORE_LEVELS) {
                errors.push(
                  `${qPrefix}.criteria: Score 评分档位不能超过 ${MAX_SCORE_LEVELS} 个 (当前: ${q.criteria.length})`
                );
              }
            }
          }

          // Noul 类型校验
          if (q.type === 'noul') {
            if (q.thresholds && typeof q.thresholds === 'object') {
              const { yes, no } = q.thresholds;
              if (yes !== undefined && (typeof yes !== 'number' || yes < 0 || yes > 1)) {
                errors.push(`${qPrefix}.thresholds.yes: Noul '是' 阈值必须在 0.0 到 1.0 之间`);
              }
              if (no !== undefined && (typeof no !== 'number' || no < 0 || no > 1)) {
                errors.push(`${qPrefix}.thresholds.no: Noul '否' 阈值必须在 0.0 到 1.0 之间`);
              }
              if (yes !== undefined && no !== undefined && yes < no) {
                errors.push(
                  `${qPrefix}.thresholds: Noul '是' 阈值 (${yes}) 必须大于等于 '否' 阈值 (${no})`
                );
              }
            }
          }
        });
      }

      // 置信度兜底区间校验
      if (bData.enableConfidenceFallback && bData.confidenceRange) {
        if (!Array.isArray(bData.confidenceRange) || bData.confidenceRange.length !== 2) {
          errors.push(`${nodePrefix}.data.confidenceRange: 置信度区间必须为包含 2 个数值的数组 [min, max]`);
        } else {
          const [min, max] = bData.confidenceRange;
          if (typeof min !== 'number' || typeof max !== 'number' || min < 0 || max > 1 || min > max) {
            errors.push(
              `${nodePrefix}.data.confidenceRange: 置信度区间 [${min}, ${max}] 无效，需满足 0 <= min <= max <= 1`
            );
          }
        }
      }
    }
  });

  // 连线基本校验
  edges.forEach((edge, edgeIdx) => {
    const ePrefix = `edges[${edgeIdx}]`;
    if (!edge || typeof edge !== 'object') {
      errors.push(`${ePrefix}: 连线数据无效`);
      return;
    }
    if (!edge.source || !edge.target) {
      errors.push(`${ePrefix}: 连线必须同时具备 source 与 target`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
