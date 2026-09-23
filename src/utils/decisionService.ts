import { BatchNodeData, Question, NoulQuestion } from '../types/workflow';
import { resolveOpenRouterModel, resolveNativeModel } from './modelMap';

export type ProviderType = 'local' | 'openrouter' | 'typesafe';

export interface ProviderConfig {
  provider: ProviderType;
  apiKey: string;
  endpoint: string;
  model: string;
  isDemoMode: boolean; // 纯前端演示模式 (Mock Demo)
}

export const DEFAULT_PROVIDER_CONFIG: Record<
  ProviderType,
  { endpoint: string; model: string; placeholderKey: string; docUrl: string }
> = {
  local: {
    endpoint: 'in-browser',
    model: 'jev-local-simulator',
    placeholderKey: '无需 API Key（本地离线运行）',
    docUrl: '',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/alpha/decisions',
    model: 'typesafe/jev-latest',
    placeholderKey: 'sk-or-v1-...（留空自动使用纯前端高保真演示）',
    docUrl: 'https://openrouter.ai/docs#decisions',
  },
  typesafe: {
    endpoint: 'https://api.typesafe.ai/v1/systemone',
    model: 'jev-latest',
    placeholderKey: 'typesafe-api-key（留空自动使用纯前端高保真演示）',
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
  isDemo: boolean;
}

/**
 * 启发式本地仿真单个问题
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

  // 针对明显特征关键词增强探测 (如 广告, 诈骗, 辱骂, 敏感, 投诉)
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
 * 测试服务商连通性 (Ping Test)
 */
export async function pingProvider(config: ProviderConfig): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
}> {
  const startTime = performance.now();

  // 本地仿真直接返回
  if (config.provider === 'local') {
    return {
      success: true,
      latencyMs: 1,
      message: '本地启发式引擎就绪 (无需网络)',
    };
  }

  // 纯前端演示模式
  if (config.isDemoMode || !config.apiKey.trim()) {
    await new Promise((r) => setTimeout(r, Math.floor(80 + Math.random() * 60)));
    const latency = Math.round(performance.now() - startTime);
    return {
      success: true,
      latencyMs: latency,
      message: `纯前端高保真演示已就绪 (${config.provider === 'openrouter' ? 'OpenRouter Alpha' : 'TypeSafe 官方'} 模拟正常)`,
    };
  }

  // 真实 API 测试调用
  try {
    const endpoint = config.endpoint || DEFAULT_PROVIDER_CONFIG[config.provider].endpoint;
    const cleanKey = config.apiKey.trim();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanKey}`,
        'HTTP-Referer': 'https://sysone.originagent.cn',
        'X-Title': 'SysOne GX Decision Studio',
      },
      body: JSON.stringify({
        model: config.model || (config.provider === 'openrouter' ? 'typesafe/jev-latest' : 'jev-latest'),
        state: 'ping test',
        questions: {
          ping_check: {
            type: 'noul',
            instructions: 'Is this a connectivity ping check?',
          },
        },
      }),
    });

    const latency = Math.round(performance.now() - startTime);

    if (response.ok) {
      return {
        success: true,
        latencyMs: latency,
        message: `API 接口连通成功！(HTTP ${response.status})`,
      };
    } else {
      const errText = await response.text();
      return {
        success: false,
        latencyMs: latency,
        message: `接口返回错误 [${response.status}]: ${errText.slice(0, 100)}`,
      };
    }
  } catch (err: any) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs: latency,
      message: `网络或跨域受限: ${err.message || '请勾选“纯前端演示”以畅快体验'}`,
    };
  }
}

/**
 * 统一执行决策批次 (支持真实 API 与纯前端演示双通道)
 */
export async function executeBatchDecision(
  batchData: BatchNodeData,
  stateInput: string,
  config: ProviderConfig
): Promise<DecisionExecutionResult> {
  const startTime = performance.now();
  const isDemo = config.provider === 'local' || config.isDemoMode || !config.apiKey.trim();

  // 1. 如果是本地模式或纯前端演示模式
  if (isDemo) {
    // 模拟真实的 AI 计算网络延迟 (150ms ~ 320ms)
    await new Promise((r) => setTimeout(r, Math.floor(150 + Math.random() * 150)));

    const answers: Record<string, any> = {};
    const stateLower = stateInput.toLowerCase();

    for (const q of batchData.questions) {
      answers[q.id] = heuristicSimulateQuestion(q, stateLower);
    }

    const duration = Math.round(performance.now() - startTime);
    const modelUsed =
      config.provider === 'openrouter'
        ? resolveOpenRouterModel(batchData.model || 'typesafe/jev-latest')
        : resolveNativeModel(batchData.model || 'jev-latest');

    // 格式化真实的 Raw Response 报文
    const rawPayload = {
      id: `jev_dec_${Date.now().toString(36)}`,
      provider: config.provider,
      mode: 'pure-frontend-demo',
      model: modelUsed,
      state: stateInput.startsWith('{') ? (() => { try { return JSON.parse(stateInput); } catch { return stateInput; } })() : stateInput,
      answers,
      usage: {
        input_tokens: Math.max(20, Math.floor(stateInput.length / 3) + batchData.questions.length * 15),
        output_tokens: batchData.questions.length * 8,
        cost: config.provider === 'openrouter' ? 0.00018 : undefined,
      },
      created_at: new Date().toISOString(),
    };

    return {
      answers,
      rawResponse: JSON.stringify(rawPayload, null, 2),
      executionTimeMs: duration,
      usage: {
        inputTokens: rawPayload.usage.input_tokens,
        outputTokens: rawPayload.usage.output_tokens,
        cost: rawPayload.usage.cost,
      },
      modelUsed,
      provider: config.provider,
      isDemo: true,
    };
  }

  // 2. 真实 API 执行模式
  const endpoint = config.endpoint || DEFAULT_PROVIDER_CONFIG[config.provider].endpoint;
  const cleanKey = config.apiKey.trim();

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

  const modelUsed =
    config.provider === 'openrouter'
      ? resolveOpenRouterModel(batchData.model || 'typesafe/jev-latest')
      : resolveNativeModel(batchData.model || 'jev-latest');

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
    throw new Error(`API 调用失败 [${response.status}]: ${errDetail}`);
  }

  const resJson = await response.json();

  return {
    answers: resJson.answers || {},
    rawResponse: JSON.stringify(resJson, null, 2),
    executionTimeMs: duration,
    usage: {
      inputTokens: resJson.usage?.input_tokens ?? 0,
      outputTokens: resJson.usage?.output_tokens ?? 0,
      cost: resJson.usage?.cost,
    },
    modelUsed,
    provider: config.provider,
    isDemo: false,
  };
}

/**
 * 常用测试工单/样本预设（参考 bbs-go 风控与工单场景）
 */
export const STATE_PRESETS = [
  {
    name: '广告兼职引流',
    tag: '垃圾营销',
    color: 'amber',
    text: JSON.stringify(
      {
        title: '【高薪招聘】全职兼职日结300-800，居家可做！',
        content: '无需经验，操作简单，只要有手机就能做！加客服微信/QQ: vip_998877 领取任务，名额有限先到先得！',
      },
      null,
      2
    ),
  },
  {
    name: '严重人身攻击',
    tag: '恶意辱骂',
    color: 'rose',
    text: JSON.stringify(
      {
        title: '关于某开发者的控诉',
        content: '你这个脑残写的什么垃圾代码，赶紧滚出开源社区吧！全家不得好死，再看到你我就人肉你！',
      },
      null,
      2
    ),
  },
  {
    name: '加急退款工单',
    tag: '客户申诉',
    color: 'sky',
    text: JSON.stringify(
      {
        ticket_id: 'REFUND-2026-0923',
        customer_tier: 'SVIP',
        message: '已经发货一周了物流一直停滞在转运中心，客服电话永远没人接！今天之内必须给我原路全额退款，否则直接投诉到12315消协！',
      },
      null,
      2
    ),
  },
  {
    name: '正常技术探讨',
    tag: '合规交流',
    color: 'emerald',
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
