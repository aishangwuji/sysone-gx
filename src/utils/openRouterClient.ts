import { BatchNodeData } from "../types/workflow";
import { resolveOpenRouterModel } from "./modelMap";

export interface OpenRouterDecisionRequest {
  model: string;
  state: Record<string, any> | string;
  questions: Record<string, any>;
}

export interface OpenRouterDecisionResponse {
  model?: string;
  answers: Record<string, {
    type: "choice" | "score" | "noul";
    choice?: string;
    score?: number;
    noul?: number;
    confidence?: number;
    probabilities?: Record<string, number>;
    legend?: Record<string, string>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cost?: number;
  };
}

/**
 * Executes a live parallel batch evaluation through OpenRouter Decisions API
 * Endpoint: https://openrouter.ai/api/alpha/decisions
 */
export async function callOpenRouterDecisions(
  batchData: BatchNodeData,
  stateInput: string,
  apiKey: string
): Promise<OpenRouterDecisionResponse> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error("OpenRouter API key is required to execute live model calls.");
  }

  // Build formatted questions dict matching OpenRouter alpha.decisions schema
  const questionsPayload: Record<string, any> = {};

  for (const q of batchData.questions) {
    if (q.type === "choice") {
      questionsPayload[q.id] = {
        type: "choice",
        instructions: q.instructions,
        criteria: q.criteria
      };
    } else if (q.type === "score") {
      questionsPayload[q.id] = {
        type: "score",
        instructions: q.instructions,
        criteria: q.criteria
      };
    } else if (q.type === "noul") {
      const noulPayload: Record<string, any> = {
        type: "noul",
        instructions: q.instructions
      };
      if (q.criteria?.true || q.criteria?.false) {
        noulPayload.criteria = q.criteria;
      }
      questionsPayload[q.id] = noulPayload;
    }
  }

  // Parse stateInput as JSON object if possible; otherwise pass through raw string per TypeSafe AI spec
  let statePayload: any = stateInput;
  try {
    const parsed = JSON.parse(stateInput);
    if (typeof parsed === 'object' && parsed !== null) {
      statePayload = parsed;
    }
  } catch {
    statePayload = stateInput;
  }

  // Single source of truth model resolution for OpenRouter catalog
  const modelName = resolveOpenRouterModel(batchData.model || "jev-latest");

  const response = await fetch("https://openrouter.ai/api/alpha/decisions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + cleanKey,
      "HTTP-Referer": "https://sysone-gx.local",
      "X-Title": "SysOne GX Studio"
    },
    body: JSON.stringify({
      model: modelName,
      state: statePayload,
      questions: questionsPayload
    })
  });

  if (!response.ok) {
    let errDetail = response.statusText;
    try {
      const errJson = await response.json();
      errDetail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
    } catch {
      errDetail = await response.text();
    }
    throw new Error(`OpenRouter API Error (${response.status}): ${errDetail}`);
  }

  const data = await response.json();
  return data as OpenRouterDecisionResponse;
}
