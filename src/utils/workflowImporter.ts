import { Node, Edge } from '@xyflow/react';
import { BatchNodeData, ActionNodeData, Question, ChoiceQuestion, ScoreQuestion, NoulQuestion } from '../types/workflow';
import { validateWorkflow } from '../../shared/validateWorkflow';

export type DetectedFormat = 'bbs-go' | 'jev-payload' | 'sysone-gx' | 'invalid';

export interface ImportSummary {
  format: DetectedFormat;
  formatLabel: string;
  batchCount: number;
  questionCount: number;
  choiceCount: number;
  scoreCount: number;
  noulCount: number;
  actionCount: number;
  edgeCount: number;
  hasStateInput: boolean;
}

export interface ImportResult {
  success: boolean;
  nodes: Node[];
  edges: Edge[];
  stateInput?: string;
  summary?: ImportSummary;
  error?: string;
}

/**
 * 探测输入 JSON 的格式类型
 */
export function detectFormat(data: any): DetectedFormat {
  if (!data || typeof data !== 'object') {
    return 'invalid';
  }

  // 1. SysOne GX DSL: 包含 nodes 与 edges 数组
  if (Array.isArray(data.nodes) && Array.isArray(data.edges)) {
    return 'sysone-gx';
  }
  if (data.workflowData && Array.isArray(data.workflowData.nodes) && Array.isArray(data.workflowData.edges)) {
    return 'sysone-gx';
  }

  // 2. bbs-go 规则配置: 包含 noulQuestions / scoreQuestions / choiceQuestions 之一
  if (
    Array.isArray(data.noulQuestions) ||
    Array.isArray(data.scoreQuestions) ||
    Array.isArray(data.choiceQuestions)
  ) {
    return 'bbs-go';
  }

  // 3. Jev 原生问询 Payload: 包含 questions 字典对象，且键值中存在 type 为 choice / score / noul
  if (data.questions && typeof data.questions === 'object' && !Array.isArray(data.questions)) {
    const qValues = Object.values(data.questions);
    if (qValues.length === 0 || qValues.some((item: any) => item && typeof item === 'object' && ('type' in item || 'instructions' in item))) {
      return 'jev-payload';
    }
  }

  return 'invalid';
}

/**
 * 获取格式的中文易读名称
 */
export function getFormatLabel(format: DetectedFormat): string {
  switch (format) {
    case 'bbs-go':
      return 'bbs-go 社区风控规则配置';
    case 'jev-payload':
      return 'Jev System One 原生 Payload';
    case 'sysone-gx':
      return 'SysOne GX 决策流 DSL';
    default:
      return '未知或不支持的格式';
  }
}

/**
 * 将 bbs-go Jev 规则配置转换为 SysOne GX 的图形化节点与分支连线
 */
export function convertBbsGoConfig(data: any): ImportResult {
  try {
    const questions: Question[] = [];
    let choiceCount = 0;
    let scoreCount = 0;
    let noulCount = 0;

    // 1. 转换 Choice 问询
    const choiceList = Array.isArray(data.choiceQuestions) ? data.choiceQuestions : [];
    choiceList.forEach((cq: any, idx: number) => {
      if (cq.enabled === false) return;
      choiceCount++;
      const qId = cq.key ? String(cq.key) : `choice_${idx + 1}`;
      
      let criteriaObj: Record<string, any> = {};
      if (typeof cq.criteria === 'object' && cq.criteria !== null && !Array.isArray(cq.criteria)) {
        criteriaObj = cq.criteria;
      } else if (Array.isArray(cq.criteria)) {
        cq.criteria.forEach((item: string) => {
          criteriaObj[item] = item;
        });
      }

      // 如果未指定任何选项，兜底提供默认二分类
      if (Object.keys(criteriaObj).length === 0) {
        criteriaObj = { normal: '正常内容', suspicious: '可疑内容' };
      }

      questions.push({
        _uid: `q_${Date.now()}_c_${idx}`,
        id: qId,
        type: 'choice',
        instructions: cq.instructions || cq.label || '分类研判',
        criteria: criteriaObj,
      } as ChoiceQuestion);
    });

    // 2. 转换 Score 问询
    const scoreList = Array.isArray(data.scoreQuestions) ? data.scoreQuestions : [];
    scoreList.forEach((sq: any, idx: number) => {
      if (sq.enabled === false) return;
      scoreCount++;
      const qId = sq.key ? String(sq.key) : `score_${idx + 1}`;
      
      let criteriaArr: any[] = [];
      if (Array.isArray(sq.criteria) && sq.criteria.length > 0) {
        criteriaArr = sq.criteria;
      } else {
        criteriaArr = [
          '0 档位: 无风险 / 完全合规',
          '1 档位: 存在争议 / 存疑',
          '2 档位: 严重违规 / 明确风险',
        ];
      }

      questions.push({
        _uid: `q_${Date.now()}_s_${idx}`,
        id: qId,
        type: 'score',
        instructions: sq.instructions || sq.label || '严重程度打分',
        criteria: criteriaArr,
      } as ScoreQuestion);
    });

    // 3. 转换 Noul 问询
    const noulList = Array.isArray(data.noulQuestions) ? data.noulQuestions : [];
    noulList.forEach((nq: any, idx: number) => {
      if (nq.enabled === false) return;
      noulCount++;
      const qId = nq.key ? String(nq.key) : `noul_${idx + 1}`;

      const yesThresh = typeof nq.rejectThreshold === 'number' ? nq.rejectThreshold : 0.85;
      const noThresh = typeof nq.reviewThreshold === 'number' ? nq.reviewThreshold : 0.45;

      questions.push({
        _uid: `q_${Date.now()}_n_${idx}`,
        id: qId,
        type: 'noul',
        instructions: nq.instructions || nq.label || '校准概率判定',
        thresholds: {
          yes: yesThresh,
          no: noThresh,
        },
        criteria: {
          true: '命中违规定义',
          false: '未命中任何违规特征',
        },
      } as NoulQuestion);
    });

    if (questions.length === 0) {
      return {
        success: false,
        nodes: [],
        edges: [],
        error: '未在 bbs-go 配置中找到任何已启用的评估问题 (noulQuestions/scoreQuestions/choiceQuestions)',
      };
    }

    const batchNodeId = 'batch_jev_main';
    const batchNode: Node = {
      id: batchNodeId,
      type: 'batchNode',
      position: { x: 100, y: 160 },
      data: {
        title: 'bbs-go 智能风控主评估批次',
        description: '自动解析并合并 bbs-go 的并行问询规约，单次网络往返完成全量判定',
        model: 'jev-latest',
        enableConfidenceFallback: true,
        confidenceRange: [0.35, 0.70],
        confidenceThreshold: 0.70,
        questions,
      } as BatchNodeData,
    };

    // 生成 3 个标准动作节点（形成清晰的处置漏斗）
    const rejectNodeId = 'action_reject';
    const reviewNodeId = 'action_review';
    const approveNodeId = 'action_approve';

    const actionNodes: Node[] = [
      {
        id: rejectNodeId,
        type: 'actionNode',
        position: { x: 680, y: 80 },
        data: {
          title: '违规直接拦截 (Auto Reject)',
          actionType: 'return_response',
          config: {
            status: 'rejected',
            message: '内容已被 Jev 智能风控引擎自动拦截，禁止入库并记录违规日志。',
          },
        } as ActionNodeData,
      },
      {
        id: reviewNodeId,
        type: 'actionNode',
        position: { x: 680, y: 260 },
        data: {
          title: '人工复核待审 (Human Review)',
          actionType: 'human_review',
          config: {
            team: '风控合规组',
            message: '内容存在潜在违规或低置信度模糊，已自动流转至待审工单队列。',
          },
        } as ActionNodeData,
      },
      {
        id: approveNodeId,
        type: 'actionNode',
        position: { x: 680, y: 440 },
        data: {
          title: '审核放行通过 (Auto Approve)',
          actionType: 'database_update',
          config: {
            status: 'approved',
            message: '全维度评估通过，允许即时发布上线并展示。',
          },
        } as ActionNodeData,
      },
    ];

    // 生成边 (Edges)
    const edges: Edge[] = [];

    // 置信度兜底防线 -> 人工复核
    edges.push({
      id: `edge_${batchNodeId}_fallback`,
      source: batchNodeId,
      sourceHandle: 'fallback_handle',
      target: reviewNodeId,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#F59E0B', strokeWidth: 2 },
    });

    // Choice 问询的分流连线
    choiceList.forEach((cq: any) => {
      if (cq.enabled === false) return;
      const qId = cq.key;
      const autoReject: string[] = Array.isArray(cq.autoRejectOptions) ? cq.autoRejectOptions : [];
      const autoReview: string[] = Array.isArray(cq.autoReviewOptions) ? cq.autoReviewOptions : [];

      autoReject.forEach((opt) => {
        edges.push({
          id: `edge_${batchNodeId}_${qId}_${opt}_reject`,
          source: batchNodeId,
          sourceHandle: `q_${qId}_${opt}`,
          target: rejectNodeId,
          type: 'smoothstep',
          style: { stroke: '#EF4444', strokeWidth: 2 },
        });
      });

      autoReview.forEach((opt) => {
        edges.push({
          id: `edge_${batchNodeId}_${qId}_${opt}_review`,
          source: batchNodeId,
          sourceHandle: `q_${qId}_${opt}`,
          target: reviewNodeId,
          type: 'smoothstep',
          style: { stroke: '#F59E0B', strokeWidth: 2 },
        });
      });
    });

    // Noul 问询的分流连线 (是 -> 拦截；否 -> 放行)
    noulList.forEach((nq: any) => {
      if (nq.enabled === false) return;
      const qId = nq.key;
      edges.push({
        id: `edge_${batchNodeId}_${qId}_yes_reject`,
        source: batchNodeId,
        sourceHandle: `q_${qId}_yes`,
        target: rejectNodeId,
        type: 'smoothstep',
        style: { stroke: '#EF4444', strokeWidth: 2 },
      });
      edges.push({
        id: `edge_${batchNodeId}_${qId}_no_approve`,
        source: batchNodeId,
        sourceHandle: `q_${qId}_no`,
        target: approveNodeId,
        type: 'smoothstep',
        style: { stroke: '#10B981', strokeWidth: 2 },
      });
    });

    // Score 问询的分流连线
    scoreList.forEach((sq: any) => {
      if (sq.enabled === false) return;
      const qId = sq.key;
      const rejectThresh = typeof sq.rejectThreshold === 'number' ? sq.rejectThreshold : 2;
      const reviewThresh = typeof sq.reviewThreshold === 'number' ? sq.reviewThreshold : 1;
      const critLen = Array.isArray(sq.criteria) ? sq.criteria.length : 3;

      for (let i = 0; i < critLen; i++) {
        if (i >= rejectThresh) {
          edges.push({
            id: `edge_${batchNodeId}_${qId}_${i}_reject`,
            source: batchNodeId,
            sourceHandle: `q_${qId}_${i}`,
            target: rejectNodeId,
            type: 'smoothstep',
            style: { stroke: '#EF4444', strokeWidth: 2 },
          });
        } else if (i >= reviewThresh) {
          edges.push({
            id: `edge_${batchNodeId}_${qId}_${i}_review`,
            source: batchNodeId,
            sourceHandle: `q_${qId}_${i}`,
            target: reviewNodeId,
            type: 'smoothstep',
            style: { stroke: '#F59E0B', strokeWidth: 2 },
          });
        } else {
          edges.push({
            id: `edge_${batchNodeId}_${qId}_${i}_approve`,
            source: batchNodeId,
            sourceHandle: `q_${qId}_${i}`,
            target: approveNodeId,
            type: 'smoothstep',
            style: { stroke: '#10B981', strokeWidth: 2 },
          });
        }
      }
    });

    // 生成仿真状态预填文本
    const maxLen = typeof data.maxContentLength === 'number' ? data.maxContentLength : 500;
    const includeTitle = data.includeTitle !== false;
    const sampleState = {
      ...(includeTitle ? { title: '【测试】bbs-go 社区发帖与评论风控自动化测试' } : {}),
      content: `这是一个用于仿真测试 bbs-go Jev 风控策略的样本正文 (最大截断: ${maxLen} 字符)。点击右下角“运行决策追踪”可即时观察路径动画。`,
    };
    const stateInput = JSON.stringify(sampleState, null, 2);

    const allNodes = [batchNode, ...actionNodes];

    const summary: ImportSummary = {
      format: 'bbs-go',
      formatLabel: getFormatLabel('bbs-go'),
      batchCount: 1,
      questionCount: questions.length,
      choiceCount,
      scoreCount,
      noulCount,
      actionCount: actionNodes.length,
      edgeCount: edges.length,
      hasStateInput: true,
    };

    return {
      success: true,
      nodes: allNodes,
      edges,
      stateInput,
      summary,
    };
  } catch (err: any) {
    return {
      success: false,
      nodes: [],
      edges: [],
      error: `解析 bbs-go 规则配置失败: ${err.message || String(err)}`,
    };
  }
}

/**
 * 将 Jev 原生问询 Payload 转换为 SysOne GX 的图形化节点与分支连线
 */
export function convertJevPayload(data: any): ImportResult {
  try {
    const rawQuestions = data.questions || {};
    const questions: Question[] = [];
    let choiceCount = 0;
    let scoreCount = 0;
    let noulCount = 0;

    Object.entries(rawQuestions).forEach(([qId, qConf]: [string, any], idx: number) => {
      const qType = qConf?.type || (qConf?.criteria && Array.isArray(qConf.criteria) ? 'score' : 'choice');
      const instructions = qConf?.instructions || qConf?.question || qConf?.prompt || '';

      if (qType === 'score') {
        scoreCount++;
        const criteria = Array.isArray(qConf?.criteria) && qConf.criteria.length >= 2
          ? qConf.criteria
          : ['低档位 / 否', '中档位 / 存疑', '高档位 / 是'];
        questions.push({
          _uid: `q_${Date.now()}_${idx}`,
          id: qId,
          type: 'score',
          instructions,
          criteria,
        } as ScoreQuestion);
      } else if (qType === 'noul') {
        noulCount++;
        questions.push({
          _uid: `q_${Date.now()}_${idx}`,
          id: qId,
          type: 'noul',
          instructions,
          thresholds: {
            yes: qConf?.thresholds?.yes ?? 0.70,
            no: qConf?.thresholds?.no ?? 0.30,
          },
          criteria: qConf?.criteria || { true: '判定为真', false: '判定为假' },
        } as NoulQuestion);
      } else {
        choiceCount++;
        let criteriaObj: Record<string, any> = {};
        if (qConf?.criteria && typeof qConf.criteria === 'object' && !Array.isArray(qConf.criteria)) {
          criteriaObj = qConf.criteria;
        } else if (Array.isArray(qConf?.criteria)) {
          qConf.criteria.forEach((k: string) => {
            criteriaObj[k] = k;
          });
        } else {
          criteriaObj = { option_a: '选项 A', option_b: '选项 B' };
        }
        questions.push({
          _uid: `q_${Date.now()}_${idx}`,
          id: qId,
          type: 'choice',
          instructions,
          criteria: criteriaObj,
        } as ChoiceQuestion);
      }
    });

    if (questions.length === 0) {
      return {
        success: false,
        nodes: [],
        edges: [],
        error: '未在 Payload 中提取到有效的问题定义 (questions 对象为空)',
      };
    }

    const batchNode: Node = {
      id: 'batch_imported_payload',
      type: 'batchNode',
      position: { x: 100, y: 160 },
      data: {
        title: 'Jev 原生 Payload 批次',
        description: '从 Jev 原生 Payload 自动还原的并发问询批次',
        model: data.model || 'jev-latest',
        enableConfidenceFallback: true,
        confidenceRange: [0.30, 0.70],
        confidenceThreshold: 0.70,
        questions,
      } as BatchNodeData,
    };

    const actionNode: Node = {
      id: 'action_imported_result',
      type: 'actionNode',
      position: { x: 680, y: 220 },
      data: {
        title: '返回 API 响应结果',
        actionType: 'return_response',
        config: {
          status: 'success',
          message: '已成功执行 Jev System One 决策并返回结果',
        },
      } as ActionNodeData,
    };

    const edges: Edge[] = [
      {
        id: 'edge_imported_batch_action',
        source: batchNode.id,
        target: actionNode.id,
        type: 'smoothstep',
        style: { stroke: '#0284C7', strokeWidth: 2 },
      },
    ];

    let stateInput = '';
    if (data.state) {
      stateInput = typeof data.state === 'string' ? data.state : JSON.stringify(data.state, null, 2);
    } else {
      stateInput = JSON.stringify({ message: '这是一个待判定的输入样本' }, null, 2);
    }

    const summary: ImportSummary = {
      format: 'jev-payload',
      formatLabel: getFormatLabel('jev-payload'),
      batchCount: 1,
      questionCount: questions.length,
      choiceCount,
      scoreCount,
      noulCount,
      actionCount: 1,
      edgeCount: 1,
      hasStateInput: Boolean(data.state),
    };

    return {
      success: true,
      nodes: [batchNode, actionNode],
      edges,
      stateInput,
      summary,
    };
  } catch (err: any) {
    return {
      success: false,
      nodes: [],
      edges: [],
      error: `解析 Jev Payload 失败: ${err.message || String(err)}`,
    };
  }
}

/**
 * 统一解析工作流输入（主调度函数）
 */
export function parseAndConvertWorkflow(jsonStr: string): ImportResult {
  const trimmed = jsonStr.trim();
  if (!trimmed) {
    return {
      success: false,
      nodes: [],
      edges: [],
      error: '输入内容为空，请粘贴 JSON 文本或上传 .json 配置文件',
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err: any) {
    return {
      success: false,
      nodes: [],
      edges: [],
      error: `JSON 语法错误: ${err.message || '格式无法被解析'}`,
    };
  }

  const format = detectFormat(parsed);

  if (format === 'bbs-go') {
    return convertBbsGoConfig(parsed);
  }

  if (format === 'jev-payload') {
    return convertJevPayload(parsed);
  }

  if (format === 'sysone-gx') {
    const rawWf = parsed.workflowData || parsed;
    const validation = validateWorkflow(rawWf);
    if (!validation.valid) {
      return {
        success: false,
        nodes: [],
        edges: [],
        error: `SysOne GX 规范校验未通过:\n${validation.errors.slice(0, 3).join('\n')}`,
      };
    }

    const nodes = rawWf.nodes as Node[];
    const edges = rawWf.edges as Edge[];
    let choiceCount = 0;
    let scoreCount = 0;
    let noulCount = 0;
    let qCount = 0;

    nodes.forEach((n) => {
      if (n.type === 'batchNode') {
        const bData = n.data as unknown as BatchNodeData;
        if (Array.isArray(bData.questions)) {
          bData.questions.forEach((q) => {
            qCount++;
            if (q.type === 'choice') choiceCount++;
            else if (q.type === 'score') scoreCount++;
            else if (q.type === 'noul') noulCount++;
          });
        }
      }
    });

    const summary: ImportSummary = {
      format: 'sysone-gx',
      formatLabel: getFormatLabel('sysone-gx'),
      batchCount: nodes.filter((n) => n.type === 'batchNode').length,
      questionCount: qCount,
      choiceCount,
      scoreCount,
      noulCount,
      actionCount: nodes.filter((n) => n.type === 'actionNode').length,
      edgeCount: edges.length,
      hasStateInput: Boolean(parsed.testStateInput),
    };

    return {
      success: true,
      nodes,
      edges,
      stateInput: parsed.testStateInput || undefined,
      summary,
    };
  }

  return {
    success: false,
    nodes: [],
    edges: [],
    error: '无法识别此 JSON 格式。支持格式：bbs-go 规则配置、Jev 原生 Payload 或 SysOne GX 工作流 DSL。',
  };
}

/**
 * 内置预设示例数据（便于开发者一键载入体验）
 */
export const PRESET_SAMPLES = {
  bbsGo: {
    name: 'bbs-go 社区风控规则配置',
    description: '包含垃圾营销广告判定(Noul)、言论攻击辱骂评分(Score)与内容违规分类(Choice)',
    json: JSON.stringify(
      {
        maxContentLength: 500,
        includeTitle: true,
        noulQuestions: [
          {
            key: 'is_spam',
            label: '垃圾营销广告',
            instructions: 'Does title or content contain spam, commercial ads, fraudulent schemes, or prohibited promotional links?',
            rejectThreshold: 0.85,
            reviewThreshold: 0.45,
            enabled: true,
          },
        ],
        scoreQuestions: [
          {
            key: 'toxicity',
            label: '攻击辱骂严重度',
            instructions: 'How toxic, abusive, or hostile is the tone of this post?',
            criteria: [
              '0: 文明理性讨论；友好或中立语气',
              '1: 略微不文明或轻度挑衅，但仍属正常技术/社区交流范围',
              '2: 严重人身攻击、粗俗辱骂、仇恨言论或明确骚扰',
            ],
            rejectThreshold: 2,
            reviewThreshold: 1,
            enabled: true,
          },
        ],
        choiceQuestions: [
          {
            key: 'violation_type',
            label: '违规类型分类',
            instructions: 'What primary policy violation category does this submission fall under?',
            criteria: {
              normal: '正常技术探讨与社区交流',
              politics: '涉政暴恐或敏感内容',
              illegal: '违法犯罪或黑灰产引流',
              copyright: '侵权盗版或侵犯隐私',
            },
            autoRejectOptions: ['politics', 'illegal'],
            autoReviewOptions: ['copyright'],
            enabled: true,
          },
        ],
      },
      null,
      2
    ),
  },

  jevPayload: {
    name: 'Jev 原生问询 Payload',
    description: '标准 TypeSafe System One API 请求体，包含多维意图分类与概率评分',
    json: JSON.stringify(
      {
        model: 'jev-latest',
        state: {
          ticket_id: 'TCK-2026-9901',
          customer_tier: 'VIP_GOLD',
          message: '我的订单包裹已经延期5天没有更新物流了，客服电话一直占线，请立刻给我退款！',
        },
        questions: {
          customer_intent: {
            type: 'choice',
            instructions: 'Classify the primary intent of the customer inquiry.',
            criteria: {
              logistics_query: '查询物流进度与配送状态',
              refund_request: '申请退款或退货流程',
              complaint_escalation: '严重投诉升级与维权',
              general_inquiry: '常规咨询与业务解答',
            },
          },
          sentiment_urgency: {
            type: 'score',
            instructions: 'Evaluate the customer sentiment and urgency level.',
            criteria: [
              '低紧急度: 语气平静理性，属于常规查询',
              '中紧急度: 略显焦虑或催促，但未激化',
              '高紧急度: 情绪激动愤怒，伴随强烈投诉或退款要求',
            ],
          },
          requires_human_rep: {
            type: 'noul',
            instructions: 'Does this inquiry require immediate transfer to a human specialist?',
            thresholds: {
              yes: 0.75,
              no: 0.30,
            },
            criteria: {
              true: '用户明确要求人工介入或存在严重投诉风险',
              false: '可由自动化规则或AI助理直接闭环处理',
            },
          },
        },
      },
      null,
      2
    ),
  },
};
