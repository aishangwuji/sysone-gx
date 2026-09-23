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
    openRouterModel: 'jev-latest',
    description: '最新推荐版本'
  },
  'jev-1.13.0': {
    id: 'jev-1.13.0',
    labelKey: 'modelStable',
    nativeModel: 'jev-1.13.0',
    openRouterModel: 'jev-1.13.0',
    description: '生产稳定版本'
  }
};

export const DEFAULT_MODEL_ID = 'jev-latest';

export function resolveOpenRouterModel(modelId: string): string {
  if (!modelId) return 'jev-latest';
  const mapping = SUPPORTED_MODELS[modelId];
  if (mapping) {
    return mapping.openRouterModel;
  }
  return modelId;
}

export function resolveNativeModel(modelId: string): string {
  if (!modelId) return 'jev-latest';
  const mapping = SUPPORTED_MODELS[modelId];
  if (mapping) {
    return mapping.nativeModel;
  }
  return modelId;
}
