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
  id: string;
  type: 'choice';
  instructions: EntryType;
  criteria: Record<string, ChoiceCriteriaValue>;
}

export interface ScoreQuestion {
  id: string;
  type: 'score';
  instructions: EntryType;
  criteria: EntryType[];
}

export interface NoulQuestion {
  id: string;
  type: 'noul';
  instructions: EntryType;
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
  logs: Array<{
    nodeId: string;
    type: 'info' | 'decision' | 'fallback' | 'action';
    message: string;
  }>;
}
