export type QuestionType = 'choice' | 'score' | 'noul';

export interface StructuredCriteria {
  what?: string;
  not_for?: string;
  examples?: string[];
  [key: string]: any;
}

export type ChoiceCriteriaValue = string | StructuredCriteria | null;

export interface ChoiceQuestion {
  id: string;
  type: 'choice';
  instructions: string | Record<string, any>;
  criteria: Record<string, ChoiceCriteriaValue>;
}

export interface ScoreQuestion {
  id: string;
  type: 'score';
  instructions: string | Record<string, any>;
  criteria: Array<string | { what?: string; examples?: string[]; [key: string]: any }>;
}

export interface NoulQuestion {
  id: string;
  type: 'noul';
  instructions: string | Record<string, any>;
  criteria?: {
    true?: string | Record<string, any>;
    false?: string | Record<string, any>;
  };
}

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export interface BatchNodeData {
  title: string;
  description?: string;
  model: string;
  questions: Question[];
  enableConfidenceFallback?: boolean;
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
