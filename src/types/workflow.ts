export type QuestionType = 'choice' | 'score' | 'noul';

export type EntryType = string | Record<string, any> | any[] | null;

export interface StructuredCriteria {
  what?: string;
  not_for?: string;
  examples?: string[];
  summary?: string;
  signals?: string[];
  [key: string]: any;
}

export type ChoiceCriteriaValue = EntryType;

export interface ChoiceQuestion {
  _uid?: string;
  id: string;
  type: 'choice';
  instructions: EntryType;
  criteria: Record<string, ChoiceCriteriaValue>;
}

export interface ScoreQuestion {
  _uid?: string;
  id: string;
  type: 'score';
  instructions: EntryType;
  criteria: EntryType[];
}

export interface NoulQuestion {
  _uid?: string;
  id: string;
  type: 'noul';
  instructions: EntryType;
  thresholds?: {
    yes?: number;
    no?: number;
  };
  criteria?: {
    true?: EntryType;
    false?: EntryType;
  };
}

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export interface BatchNodeData {
  title: string;
  description?: string;
  model: string;
  questions: Question[];
  enableConfidenceFallback?: boolean;
  confidenceRange?: [number, number];
  confidenceThreshold?: number;
  simulationResult?: {
    answers?: Record<string, {
      type: QuestionType;
      choice?: string;
      score?: number;
      noul?: number;
      confidence?: number;
      probabilities?: Record<string, number>;
      legend?: Record<string, any>;
    }>;
    status?: 'active' | 'passed' | 'failed' | 'fallback';
    executionTimeMs?: number;
  };
  [key: string]: unknown;
}

export interface StructuredInstructions {
  question?: string;
  focus?: string;
  field?: {
    name?: string;
    type?: string;
    unit?: string;
    description?: string;
  };
  [key: string]: any;
}

export interface CompositeDimension {
  id: string;
  questionId: string;
  label: string;
  weight: number;
  maxLevel: number; // 默认 top_level = len(criteria) - 1
}

export interface CompositeThresholdBranch {
  id: string;
  label: string;
  operator: '>=' | '<=' | 'range';
  value: number;
  range?: [number, number];
}

export interface CompositeNodeData {
  title: string;
  description?: string;
  dimensions: CompositeDimension[];
  branches: CompositeThresholdBranch[];
  simulationResult?: {
    compositeScore?: number;
    normalizedScores?: Record<string, number>;
    activeBranchId?: string;
  };
  [key: string]: unknown;
}

export interface EdgeConfidenceGate {
  enabled: boolean;
  operator: '>=' | '<=' | 'range';
  threshold: number;
  range?: [number, number];
}

export interface EdgeData {
  label?: string;
  confidenceGate?: EdgeConfidenceGate;
  [key: string]: unknown;
}

export interface ActionNodeData {
  title: string;
  actionType: 'webhook' | 'human_review' | 'llm_escalation' | 'database_update' | 'return_response';
  config: {
    endpoint?: string;
    team?: string;
    prompt?: string;
    status?: string;
    message?: string;
  };
  simulationResult?: {
    executed: boolean;
    executedAt?: string;
  };
  [key: string]: unknown;
}

export interface SimulationTrace {
  timestamp: string;
  visitedNodeIds: string[];
  activeEdgeIds: string[];
  answers: Record<string, any>;
  finalAction?: {
    nodeId: string;
    title: string;
    actionType: string;
  };
  provider?: 'local' | 'openrouter' | 'typesafe';
  executionTimeMs?: number;
  rawResponse?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
  };
  suggestedAction?: string;
  rejectReasons?: string[];
  reviewReasons?: string[];
  logs: Array<{
    nodeId: string;
    type: 'info' | 'decision' | 'fallback' | 'action';
    message: string;
  }>;
}
