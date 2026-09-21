export interface ModelMapping {
  id: string;
  labelKey: string;
  nativeModel: string;
  openRouterModel: string;
  description: string;
}

export const SUPPORTED_MODELS: Record<string, ModelMapping> = {
  'jev-latest': {
    id: 'jev-latest',
    labelKey: 'modelRecommended',
    nativeModel: 'jev-latest',
    openRouterModel: 'typesafe/jev-1.13',
    description: 'TypeSafe 官方最新推荐版本'
  },
  'jev-1.13.0': {
    id: 'jev-1.13.0',
    labelKey: 'modelStable',
    nativeModel: 'jev-1.13.0',
    openRouterModel: 'typesafe/jev-1.13',
    description: '生产稳定版本'
  },
  'typesafe/jev-1.13': {
    id: 'typesafe/jev-1.13',
    labelKey: 'modelOpenRouter',
    nativeModel: 'jev-latest',
    openRouterModel: 'typesafe/jev-1.13',
    description: 'OpenRouter Decisions 目录模型'
  }
};

export const DEFAULT_MODEL_ID = 'jev-latest';

export function resolveOpenRouterModel(modelId: string): string {
  const mapping = SUPPORTED_MODELS[modelId];
  if (mapping) {
    return mapping.openRouterModel;
  }
  if (modelId.startsWith('typesafe/')) {
    return modelId;
  }
  throw new Error(`[ModelMap] 未知模型标识 "${modelId}"，支持的模型为: ${Object.keys(SUPPORTED_MODELS).join(', ')}`);
}

export function resolveNativeModel(modelId: string): string {
  const mapping = SUPPORTED_MODELS[modelId];
  if (mapping) {
    return mapping.nativeModel;
  }
  if (modelId.startsWith('jev-')) {
    return modelId;
  }
  throw new Error(`[ModelMap] 未知原生模型标识 "${modelId}"，支持的模型为: ${Object.keys(SUPPORTED_MODELS).join(', ')}`);
}
