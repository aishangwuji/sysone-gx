/**
 * TypeSafe AI / System One 全局业务规范常量
 */

// Noul 官方默认推荐校准阈值（可按业务场景与误判成本按题微调）
export const DEFAULT_NOUL_YES = 0.7;
export const DEFAULT_NOUL_NO = 0.3;

// Choice 选项上限
export const MAX_CHOICE_OPTIONS = 255;

// Score 分级档位上下限
export const MIN_SCORE_LEVELS = 2;
export const MAX_SCORE_LEVELS = 10;
