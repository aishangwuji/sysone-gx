import { BatchNodeData } from "../types/workflow";

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
      questionsPayload[q.id] = {
        type: "noul",
        instructions: q.instructions,
        criteria: q.criteria || {
          true: "Affirmative / Positive condition matched",
          false: "Negative / Condition not matched"
        }
      };
    }
  }

  // Parse stateInput as JSON object if possible, otherwise wrap in text object
  let statePayload: any = stateInput;
  try {
    statePayload = JSON.parse(stateInput);
  } catch {
    statePayload = { text: stateInput, ticket: stateInput };
  }

  // Normalize model ID: ensure typesafe/ namespace for OpenRouter catalog
  let modelName = batchData.model || "typesafe/jev-1.13";
  if (!modelName.includes("/")) {
    if (modelName.startsWith("jev-")) {
      modelName = "typesafe/" + modelName;
    } else {
      modelName = "typesafe/jev-1.13";
    }
  }

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
