import { BatchNodeData, Question, NoulQuestion } from '../types/workflow';
import { resolveOpenRouterModel, resolveNativeModel } from './modelMap';

export type ProviderType = 'local' | 'openrouter' | 'typesafe';

export interface ProviderConfig {
  provider: ProviderType;
  apiKey: string;
  endpoint: string;
  model: string;
}

export const DEFAULT_PROVIDER_CONFIG: Record<
  ProviderType,
  { endpoint: string; model: string; placeholderKey: string; docUrl: string }
> = {
  local: {
    endpoint: 'in-browser',
    model: 'jev-local-simulator',
    placeholderKey: '无需 API Key (本地离线评估)',
    docUrl: '',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/alpha/decisions',
    model: 'typesafe/jev-latest',
    placeholderKey: 'sk-or-v1-...',
    docUrl: 'https://openrouter.ai/docs#decisions',
  },
  typesafe: {
    endpoint: 'https://api.typesafe.ai/v1/systemone',
    model: 'jev-latest',
    placeholderKey: 'typesafe-api-key',
    docUrl: 'https://typesafe.ai/docs',
  },
};

export interface DecisionExecutionResult {
  answers: Record<string, any>;
  rawResponse: string;
  executionTimeMs: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost?: number;
  };
  modelUsed: string;
  provider: ProviderType;
}

/**
 * 启发式本地离线评估单个问题 (仅用于 local 模式)
 */
function heuristicSimulateQuestion(q: Question, stateLower: string) {
  if (q.type === 'choice') {
    const options = Object.keys(q.criteria);
    const rawScores: Record<string, number> = {};
    let totalScore = 0;

    for (const opt of options) {
      const descObj = q.criteria[opt];
      let matchScore = 0.05;

      const optKeywords = [opt.replace(/_/g, ' ')];
      if (typeof descObj === 'string') {
        optKeywords.push(...descObj.toLowerCase().split(/[ ,;.]+/));
      } else if (Array.isArray(descObj)) {
        descObj.forEach((item) => {
          if (typeof item === 'string') optKeywords.push(...item.toLowerCase().split(/[ ,;.]+/));
        });
      } else if (descObj && typeof descObj === 'object') {
        const obj = descObj as Record<string, any>;
        if (typeof obj.what === 'string') optKeywords.push(...obj.what.toLowerCase().split(/[ ,;.]+/));
        if (typeof obj.summary === 'string') optKeywords.push(...obj.summary.toLowerCase().split(/[ ,;.]+/));
      }

      for (const kw of optKeywords) {
        if (kw.length > 1 && stateLower.includes(kw)) {
          matchScore += 2.0;
        }
      }
      rawScores[opt] = matchScore;
      totalScore += matchScore;
    }

    const probabilities: Record<string, number> = {};
    let winningOpt = options[0];
    let maxProb = 0;

    for (const opt of options) {
      const p = rawScores[opt] / totalScore;
      probabilities[opt] = parseFloat(p.toFixed(3));
      if (p > maxProb) {
        maxProb = p;
        winningOpt = opt;
      }
    }

    return {
      type: 'choice' as const,
      choice: winningOpt,
      confidence: parseFloat(maxProb.toFixed(3)),
      probabilities,
    };
  }

  if (q.type === 'score') {
    const levels = q.criteria || [];
    let bestLevel = 0;
    let highestMatch = 0;

    levels.forEach((lvl, idx) => {
      let lvlText = '';
      if (typeof lvl === 'string') lvlText = lvl;
      else if (lvl && typeof lvl === 'object') {
        lvlText = (lvl as any).what || (lvl as any).summary || JSON.stringify(lvl);
      }
      const words = lvlText.toLowerCase().split(/[ ,;.]+/);
      let match = 0;
      for (const w of words) {
        if (w.length > 1 && stateLower.includes(w)) match += 1;
      }
      if (match > highestMatch) {
        highestMatch = match;
        bestLevel = idx;
      }
    });

    const confidence = parseFloat((0.65 + Math.min(0.3, highestMatch * 0.1)).toFixed(3));
    return {
      type: 'score' as const,
      score: bestLevel,
      confidence,
    };
  }

  // Noul 校准概率
  let isTrue = false;
  const nq = q as NoulQuestion;
  const instructions = String(nq.instructions || '').toLowerCase();
  const words = instructions.split(/[ ,;.]+/);

  for (const w of words) {
    if (w.length > 2 && stateLower.includes(w)) {
      isTrue = true;
      break;
    }
  }

  const alertWords = ['广告', '代刷', '兼职', '加v', '退款', '投诉', '骂', '操', '垃圾', '骗子', 'spam', 'refund', 'scam', 'abuse'];
  const hasAlert = alertWords.some((w) => stateLower.includes(w));

  const calibratedP = hasAlert
    ? parseFloat((0.82 + Math.random() * 0.15).toFixed(3))
    : isTrue
    ? parseFloat((0.65 + Math.random() * 0.15).toFixed(3))
    : parseFloat((0.08 + Math.random() * 0.15).toFixed(3));

  return {
    type: 'noul' as const,
    noul: calibratedP,
  };
}

/**
 * 真实测试服务商连通性 (Ping Test)
 */
export async function pingProvider(config: ProviderConfig): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
}> {
  const startTime = performance.now();

  if (config.provider === 'local') {
    return {
      success: true,
      latencyMs: 1,
      message: '本地离线仿真引擎正常 (无需网络调用)',
    };
  }

  const cleanKey = config.apiKey.trim();
  if (!cleanKey) {
    return {
      success: false,
      latencyMs: 0,
      message: '请先填入有效的 API Key 后再测试接口连通性',
    };
  }

  try {
    const endpoint = config.endpoint || DEFAULT_PROVIDER_CONFIG[config.provider].endpoint;
    const modelName =
      config.provider === 'openrouter'
        ? resolveOpenRouterModel(config.model || 'typesafe/jev-latest')
        : resolveNativeModel(config.model || 'jev-latest');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    };

    if (config.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://sysone.originagent.cn';
      headers['X-Title'] = 'SysOne GX Decision Studio';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelName,
        state: 'ping check',
        questions: {
          connectivity_check: {
            type: 'noul',
            instructions: 'Is this API connection responsive and online?',
          },
        },
      }),
    });

    const latency = Math.round(performance.now() - startTime);

    if (response.ok) {
      return {
        success: true,
        latencyMs: latency,
        message: `Jev 模型接口连通正常 (HTTP ${response.status})`,
      };
    } else {
      let errDetail = response.statusText;
      try {
        const errJson = await response.json();
        errDetail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
      } catch {
        errDetail = await response.text();
      }
      return {
        success: false,
        latencyMs: latency,
        message: `API 接口报错 [${response.status}]: ${errDetail.slice(0, 150)}`,
      };
    }
  } catch (err: any) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs: latency,
      message: `网络连接异常: ${err.message || String(err)}`,
    };
  }
}

/**
 * 统一执行决策批次
 * 严格按照服务商配置真实调用 Jev 模型接口；未配 Key 或调用失败即如实抛出异常，绝不伪造虚假数据。
 */
export async function executeBatchDecision(
  batchData: BatchNodeData,
  stateInput: string,
  config: ProviderConfig
): Promise<DecisionExecutionResult> {
  const startTime = performance.now();

  // 1. 本地离线仿真模式
  if (config.provider === 'local') {
    const answers: Record<string, any> = {};
    const stateLower = stateInput.toLowerCase();

    for (const q of batchData.questions) {
      answers[q.id] = heuristicSimulateQuestion(q, stateLower);
    }

    const duration = Math.round(performance.now() - startTime);
    const rawPayload = {
      provider: 'local-simulator',
      state: stateInput.startsWith('{') ? (() => { try { return JSON.parse(stateInput); } catch { return stateInput; } })() : stateInput,
      answers,
      evaluated_at: new Date().toISOString(),
    };

    return {
      answers,
      rawResponse: JSON.stringify(rawPayload, null, 2),
      executionTimeMs: Math.max(12, duration),
      modelUsed: 'local-heuristic',
      provider: 'local',
    };
  }

  // 2. 真实 API 执行模式 (OpenRouter 或 TypeSafe 官方)
  const cleanKey = config.apiKey.trim();
  if (!cleanKey) {
    const providerName = config.provider === 'openrouter' ? 'OpenRouter API Key (sk-or-v1-...)' : 'TypeSafe API Key';
    throw new Error(`未配置 ${providerName}。必须填入有效密钥后真实调用 Jev 模型，或切换为“本地离线仿真”评估。`);
  }

  const endpoint = config.endpoint || DEFAULT_PROVIDER_CONFIG[config.provider].endpoint;
  const modelUsed =
    config.provider === 'openrouter'
      ? resolveOpenRouterModel(config.model || batchData.model || 'typesafe/jev-latest')
      : resolveNativeModel(config.model || batchData.model || 'jev-latest');

  const questionsPayload: Record<string, any> = {};
  for (const q of batchData.questions) {
    questionsPayload[q.id] = {
      type: q.type,
      instructions: q.instructions,
      ...(q.criteria !== undefined ? { criteria: q.criteria } : {}),
      ...(q.type === 'noul' && (q as any).thresholds ? { thresholds: (q as any).thresholds } : {}),
    };
  }

  let statePayload: any = stateInput;
  try {
    const parsed = JSON.parse(stateInput);
    if (typeof parsed === 'object' && parsed !== null) {
      statePayload = parsed;
    }
  } catch {
    statePayload = stateInput;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cleanKey}`,
  };

  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://sysone.originagent.cn';
    headers['X-Title'] = 'SysOne GX Decision Studio';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelUsed,
      state: statePayload,
      questions: questionsPayload,
    }),
  });

  const duration = Math.round(performance.now() - startTime);

  if (!response.ok) {
    let errDetail = response.statusText;
    try {
      const errJson = await response.json();
      errDetail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
    } catch {
      errDetail = await response.text();
    }
    throw new Error(`Jev 模型调用失败 [HTTP ${response.status}]: ${errDetail}`);
  }

  const resJson = await response.json();

  return {
    answers: resJson.answers || {},
    rawResponse: JSON.stringify(resJson, null, 2),
    executionTimeMs: duration,
    usage: resJson.usage
      ? {
          inputTokens: resJson.usage.prompt_tokens ?? resJson.usage.input_tokens ?? 0,
          outputTokens: resJson.usage.completion_tokens ?? resJson.usage.output_tokens ?? 0,
          cost: resJson.usage.cost,
        }
      : undefined,
    modelUsed,
    provider: config.provider,
  };
}

/**
 * 测试工单样本 (无 em 表情)
 */
export const STATE_PRESETS = [
  {
    name: '广告兼职引流',
    tag: '垃圾营销',
    text: JSON.stringify(
      {
        title: '全职兼职日结300-800，居家可做',
        content: '无需经验，操作简单，只要有手机就能做！加客服微信/QQ: vip_998877 领取任务，名额有限先到先得！',
      },
      null,
      2
    ),
  },
  {
    name: '严重人身攻击',
    tag: '恶意辱骂',
    text: JSON.stringify(
      {
        title: '关于某开发者的控诉',
        content: '你写的什么垃圾代码，赶紧滚出开源社区吧！再看到你我就人肉你全家！',
      },
      null,
      2
    ),
  },
  {
    name: '加急退款工单',
    tag: '客户申诉',
    text: JSON.stringify(
      {
        ticket_id: 'REFUND-2026-0923',
        customer_tier: 'SVIP',
        message: '已经发货一周了物流一直停滞在转运中心，客服电话永远没人接！今天之内必须给我原路全额退款，否则直接投诉到12315！',
      },
      null,
      2
    ),
  },
  {
    name: '正常技术探讨',
    tag: '合规交流',
    text: JSON.stringify(
      {
        title: '请问 Jev 模型的校准概率 Noul 在低样本场景下表现如何？',
        content: '我们正在评估将工单自动化分流升级为 System One 概率决策树，想了解一下在多分类与二分类混合批次中的最佳实践。感谢各位解答！',
      },
      null,
      2
    ),
  },
];
