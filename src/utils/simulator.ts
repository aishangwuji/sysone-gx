import { Node, Edge } from '@xyflow/react';
import { BatchNodeData, Question, SimulationTrace } from '../types/workflow';

/**
 * Heuristic simulator for TypeSafe Jev model
 * Calculates calibrated probabilities, choice, score, noul, and confidence
 * based on input state and question criteria descriptions.
 */
export async function runWorkflowSimulation(
  nodes: Node[],
  edges: Edge[],
  stateInput: string,
  _apiKey?: string
): Promise<{ trace: SimulationTrace; updatedNodes: Node[] }> {
  const visitedNodeIds: string[] = [];
  const activeEdgeIds: string[] = [];
  const logs: SimulationTrace['logs'] = [];
  const answers: Record<string, any> = {};

  const updatedNodes = [...nodes];
  const nodeMap = new Map(updatedNodes.map((n) => [n.id, n]));

  // Find root batch node (node with incoming edge count = 0, or first batch)
  const incomingTargetSet = new Set(edges.map((e) => e.target));
  const rootNode = updatedNodes.find((n) => n.type === 'batchNode' && !incomingTargetSet.has(n.id))
    || updatedNodes.find((n) => n.type === 'batchNode');

  if (!rootNode) {
    throw new Error('No root evaluation batch node found.');
  }

  let currentNode: Node | undefined = rootNode;
  let finalAction: SimulationTrace['finalAction'] | undefined = undefined;

  logs.push({
    nodeId: rootNode.id,
    type: 'info',
    message: 'Starting workflow evaluation at root: ' + (rootNode.data.title || rootNode.id)
  });

  const stateLower = stateInput.toLowerCase();

  while (currentNode) {
    visitedNodeIds.push(currentNode.id);

    if (currentNode.type === 'actionNode') {
      const aData = currentNode.data as any;
      logs.push({
        nodeId: currentNode.id,
        type: 'action',
        message: 'Reached final action [' + aData.title + ']: ' + aData.actionType
      });
      finalAction = {
        nodeId: currentNode.id,
        title: aData.title,
        actionType: aData.actionType
      };
      currentNode.data = {
        ...currentNode.data,
        simulationResult: {
          executed: true,
          executedAt: new Date().toLocaleTimeString()
        }
      };
      break;
    }

    if (currentNode.type === 'batchNode') {
      const bData = currentNode.data as BatchNodeData;
      const batchAnswers: Record<string, any> = {};
      let lowestConfidence = 1.0;

      logs.push({
        nodeId: currentNode.id,
        type: 'info',
        message: 'Evaluating ' + bData.questions.length + ' parallel questions with System One (' + bData.model + ')...'
      });

      for (const q of bData.questions) {
        const qAns = simulateSingleQuestion(q, stateLower);
        batchAnswers[q.id] = qAns;
        answers[q.id] = qAns;

        if (qAns.confidence !== undefined && qAns.confidence < lowestConfidence) {
          lowestConfidence = qAns.confidence;
        }

        const resSummary = q.type === 'choice' ? qAns.choice : q.type === 'score' ? qAns.score.toFixed(2) : (qAns.noul * 100).toFixed(0) + '%';
        const confSummary = qAns.confidence !== undefined ? ' (Confidence: ' + qAns.confidence.toFixed(2) + ')' : '';

        logs.push({
          nodeId: currentNode.id,
          type: 'decision',
          message: 'Question [' + q.id + ' (' + q.type + ')]: Result = ' + resSummary + confSummary
        });
      }

      let nextNode: Node | undefined = undefined;
      const fallbackThreshold = bData.confidenceThreshold ?? 0.35;
      const hasFallbackEdge = edges.find((e) => e.source === currentNode?.id && e.sourceHandle === 'fallback_handle');

      if (bData.enableConfidenceFallback && lowestConfidence < fallbackThreshold && hasFallbackEdge) {
        logs.push({
          nodeId: currentNode.id,
          type: 'fallback',
          message: 'Batch confidence (' + lowestConfidence.toFixed(2) + ') fell below threshold (' + fallbackThreshold + '). Routing to Fallback!'
        });
        activeEdgeIds.push(hasFallbackEdge.id);
        nextNode = nodeMap.get(hasFallbackEdge.target);
      } else {
        const outgoingEdges = edges.filter((e) => e.source === currentNode?.id && e.sourceHandle !== 'fallback_handle');

        for (const edge of outgoingEdges) {
          const handle = edge.sourceHandle || '';
          if (handle.startsWith('q_')) {
            const matchedQ = bData.questions.find((q) => handle.startsWith('q_' + q.id + '_'));
            if (matchedQ) {
              const optionKey = handle.substring(('q_' + matchedQ.id + '_').length);
              const qAns = batchAnswers[matchedQ.id];

              if (matchedQ.type === 'choice' && qAns?.choice === optionKey) {
                activeEdgeIds.push(edge.id);
                nextNode = nodeMap.get(edge.target);
                break;
              } else if (matchedQ.type === 'score') {
                if (Math.round(qAns?.score) === parseInt(optionKey, 10)) {
                  activeEdgeIds.push(edge.id);
                  nextNode = nodeMap.get(edge.target);
                  break;
                }
              } else if (matchedQ.type === 'noul') {
                if ((optionKey === 'yes' && qAns?.noul >= 0.7) || (optionKey === 'no' && qAns?.noul <= 0.3)) {
                  activeEdgeIds.push(edge.id);
                  nextNode = nodeMap.get(edge.target);
                  break;
                }
              }
            }
          }
        }

        if (!nextNode && outgoingEdges.length > 0) {
          const fallbackEdge = outgoingEdges[0];
          activeEdgeIds.push(fallbackEdge.id);
          nextNode = nodeMap.get(fallbackEdge.target);
        }
      }

      currentNode.data = {
        ...currentNode.data,
        simulationResult: {
          answers: batchAnswers,
          status: 'passed',
          executionTimeMs: Math.floor(60 + Math.random() * 50)
        }
      };

      currentNode = nextNode;
    }
  }

  return {
    trace: {
      timestamp: new Date().toISOString(),
      visitedNodeIds,
      activeEdgeIds,
      answers,
      finalAction,
      logs
    },
    updatedNodes
  };
}

function simulateSingleQuestion(q: Question, stateLower: string): any {
  if (q.type === 'choice') {
    const options = Object.keys(q.criteria);
    const rawScores: Record<string, number> = {};
    let totalScore = 0;

    for (const opt of options) {
      const descObj = q.criteria[opt];
      let matchScore = 0.05;

      const optKeywords = [opt.replace('_', ' ')];
      if (typeof descObj === 'string') {
        optKeywords.push(...descObj.toLowerCase().split(/[ ,;.]+/));
      } else if (descObj && typeof descObj === 'object') {
        if (descObj.what) optKeywords.push(...descObj.what.toLowerCase().split(/[ ,;.]+/));
        if (Array.isArray(descObj.examples)) {
          descObj.examples.forEach((ex) => optKeywords.push(...ex.toLowerCase().split(/[ ,;.]+/)));
        }
      }

      for (const kw of optKeywords) {
        if (kw.length > 2 && stateLower.includes(kw)) {
          matchScore += 2.0;
        }
      }
      rawScores[opt] = matchScore;
      totalScore += matchScore;
    }

    const probabilities: Record<string, number> = {};
    let maxProb = 0;
    let selectedChoice = options[0];

    for (const opt of options) {
      const p = parseFloat((rawScores[opt] / totalScore).toFixed(2));
      probabilities[opt] = p;
      if (p > maxProb) {
        maxProb = p;
        selectedChoice = opt;
      }
    }

    const confidence = parseFloat(Math.min(1.0, Math.max(0.1, (maxProb - 1 / options.length) / (1 - 1 / options.length))).toFixed(2));

    return {
      type: 'choice',
      choice: selectedChoice,
      confidence,
      probabilities
    };
  } else if (q.type === 'score') {
    const levels = q.criteria;
    const count = levels.length;
    let estimatedLevel = 0;

    if (stateLower.includes('urgent') || stateLower.includes('immediately') || stateLower.includes('angry') || stateLower.includes('cancel') || stateLower.includes('right now') || stateLower.includes('two charges') || stateLower.includes('fail') || stateLower.includes('3 times')) {
      estimatedLevel = count - 1;
    } else if (stateLower.includes('wrong') || stateLower.includes('delay') || stateLower.includes('frustrated') || stateLower.includes('can i')) {
      estimatedLevel = Math.min(count - 1, 1);
    }

    const probabilities: Record<string, number> = {};
    for (let i = 0; i < count; i++) {
      if (i === estimatedLevel) {
        probabilities[String(i)] = 0.78;
      } else if (Math.abs(i - estimatedLevel) === 1) {
        probabilities[String(i)] = 0.22 / (count > 2 ? 2 : 1);
      } else {
        probabilities[String(i)] = 0.0;
      }
    }

    let calculatedScore = 0;
    for (let i = 0; i < count; i++) {
      calculatedScore += i * (probabilities[String(i)] || 0);
    }

    return {
      type: 'score',
      score: parseFloat(calculatedScore.toFixed(2)),
      confidence: 0.82,
      probabilities,
      legend: levels.reduce<Record<string, string>>((acc, l, idx) => ({ ...acc, [String(idx)]: typeof l === 'string' ? l : (l as any).what || ('Level ' + idx) }), {})
    };
  } else {
    let prob = 0.08;
    if (stateLower.includes('human') || stateLower.includes('agent') || stateLower.includes('person') || stateLower.includes('talk') || stateLower.includes('representative')) {
      prob = 0.96;
    } else if (stateLower.includes('wait') || stateLower.includes('please') || stateLower.includes('contacted')) {
      prob = 0.52;
    }

    return {
      type: 'noul',
      noul: prob
    };
  }
}
