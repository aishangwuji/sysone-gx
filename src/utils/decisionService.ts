import { BatchNodeData } from '../types/workflow';
import { resolveOpenRouterModel, resolveNativeModel } from './modelMap';

export type ProviderType = 'openrouter' | 'typesafe';

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
 * 真实测试服务商连通性 (Ping Test)
 */
export async function pingProvider(config: ProviderConfig): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
}> {
  const startTime = performance.now();

  const cleanKey = config.apiKey.trim();
  if (!cleanKey) {
    return {
      success: false,
      latencyMs: 0,
      message: '请先填入 API Key',
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
        message: `HTTP ${response.status}`,
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
        message: `HTTP ${response.status}: ${errDetail.slice(0, 120)}`,
      };
    }
  } catch (err: any) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs: latency,
      message: `${err.message || String(err)}`,
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

  const cleanKey = config.apiKey.trim();
  if (!cleanKey) {
    const providerName = config.provider === 'openrouter' ? 'OpenRouter API Key' : 'TypeSafe API Key';
    throw new Error(`未配置 ${providerName}。必须填入有效密钥后调用模型。`);
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
    throw new Error(`模型调用失败 [HTTP ${response.status}]: ${errDetail}`);
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
