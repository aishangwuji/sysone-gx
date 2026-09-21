import { Node, Edge } from '@xyflow/react';
import { BatchNodeData, Question, NoulQuestion, SimulationTrace } from '../types/workflow';
import { DEFAULT_NOUL_YES, DEFAULT_NOUL_NO } from './constants';

/**
 * High-fidelity heuristic simulator for TypeSafe Jev model.
 * Evaluates state input against choice, score, and noul primitives offline safely.
 */
export async function runWorkflowSimulation(
  nodes: Node[],
  edges: Edge[],
  stateInput: string
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
    message: 'Starting simulation evaluation at root: ' + (rootNode.data.title || rootNode.id)
  });

  const stateLower = stateInput.toLowerCase();
  const maxSteps = 25;
  let stepCount = 0;

  while (currentNode && stepCount < maxSteps) {
    stepCount++;
    visitedNodeIds.push(currentNode.id);

    if (currentNode.type === 'actionNode') {
      const aData = currentNode.data as any;
      const actionObj = {
        nodeId: currentNode.id,
        title: aData.title || currentNode.id,
        actionType: aData.actionType || 'custom'
      };
      finalAction = actionObj;

      logs.push({
        nodeId: currentNode.id,
        type: 'action',
        message: 'Action Reached: [' + actionObj.title + '] (' + actionObj.actionType + ')'
      });

      currentNode.data = {
        ...currentNode.data,
        simulationResult: {
          answers: {},
          status: 'passed',
          executionTimeMs: Math.floor(10 + Math.random() * 20)
        }
      };
      break;
    }

    if (currentNode.type === 'batchNode') {
      const bData = currentNode.data as BatchNodeData;
      const batchAnswers: Record<string, any> = {};
      let lowestConfidence = 1.0;
      const executionDuration = Math.floor(45 + Math.random() * 35);

      logs.push({
        nodeId: currentNode.id,
        type: 'info',
        message: 'Simulating ' + bData.questions.length + ' parallel questions with System One (' + bData.model + ')...'
      });

      for (const q of bData.questions) {
        const qAns = simulateSingleQuestion(q, stateLower);
        batchAnswers[q.id] = qAns;
        answers[q.id] = qAns;

        if (qAns.confidence !== undefined && (lowestConfidence === undefined || qAns.confidence < lowestConfidence)) {
          lowestConfidence = qAns.confidence;
        }

        const resSummary = q.type === 'choice' ? qAns.choice : q.type === 'score' ? qAns.score.toFixed(2) : (qAns.noul * 100).toFixed(0) + '%';
        const confSummary = q.type === 'noul'
          ? ' (Calibrated P: ' + (qAns.noul * 100).toFixed(0) + '%)'
          : qAns.confidence !== undefined
            ? ' (Confidence: ' + qAns.confidence.toFixed(2) + ')'
            : '';

        logs.push({
          nodeId: currentNode.id,
          type: 'decision',
          message: 'Question [' + q.id + ' (' + q.type + ')]: Result = ' + resSummary + confSummary
        });
      }

      let nextNode: Node | undefined = undefined;
      const confRange = bData.confidenceRange ?? [0.30, bData.confidenceThreshold ?? 0.70];
      const [confMin, confMax] = confRange;
      const hasFallbackEdge = edges.find((e) => e.source === currentNode?.id && e.sourceHandle === 'fallback_handle');

      // Check if ANY question in the batch triggers guardrail fallback:
      // 1. For choice / score: confidence falls into the uncertain range [confMin, confMax]
      // 2. For noul: calibrated probability noul falls into the uncertain range [confMin, confMax] (e.g. 0.30 ~ 0.70)
      let fallbackTriggered = false;
      let fallbackLogReason = '';

      for (const q of bData.questions) {
        const qAns = batchAnswers[q.id];
        if (!qAns) continue;

        if (q.type === 'noul') {
          const noulP = qAns.noul ?? 0.5;
          if (noulP >= confMin && noulP <= confMax) {
            fallbackTriggered = true;
            fallbackLogReason = 'Noul 问题 [' + q.id + '] 校准概率 (' + (noulP * 100).toFixed(0) + '%) 落在不确定送审区间 [' + (confMin * 100).toFixed(0) + '% ~ ' + (confMax * 100).toFixed(0) + '%]';
            break;
          }
        } else if (qAns.confidence !== undefined) {
          if (qAns.confidence >= confMin && qAns.confidence <= confMax) {
            fallbackTriggered = true;
            fallbackLogReason = '问题 [' + q.id + '] 评估置信度 (' + qAns.confidence.toFixed(2) + ') 落在兜底区间 [' + confMin.toFixed(2) + ' ~ ' + confMax.toFixed(2) + ']';
            break;
          }
        }
      }

      if (bData.enableConfidenceFallback && fallbackTriggered && hasFallbackEdge) {
        logs.push({
          nodeId: currentNode.id,
          type: 'fallback',
          message: fallbackLogReason + '。Routing to Fallback!'
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
                const nq = matchedQ as NoulQuestion;
                const yesT = nq.thresholds?.yes ?? DEFAULT_NOUL_YES;
                const noT = nq.thresholds?.no ?? DEFAULT_NOUL_NO;
                if ((optionKey === 'yes' && (qAns?.noul ?? 0) >= yesT) || (optionKey === 'no' && (qAns?.noul ?? 0) <= noT)) {
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
          executionTimeMs: executionDuration || Math.floor(60 + Math.random() * 50)
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
      } else if (Array.isArray(descObj)) {
        descObj.forEach((item) => {
          if (typeof item === 'string') optKeywords.push(...item.toLowerCase().split(/[ ,;.]+/));
        });
      } else if (descObj && typeof descObj === 'object') {
        const obj = descObj as Record<string, any>;
        if (typeof obj.what === 'string') optKeywords.push(...obj.what.toLowerCase().split(/[ ,;.]+/));
        if (typeof obj.summary === 'string') optKeywords.push(...obj.summary.toLowerCase().split(/[ ,;.]+/));
        if (Array.isArray(obj.examples)) {
          obj.examples.forEach((ex: any) => {
            if (typeof ex === 'string') optKeywords.push(...ex.toLowerCase().split(/[ ,;.]+/));
          });
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
    let sumChoiceP = 0;

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (i === options.length - 1) {
        const remaining = parseFloat((1.0 - sumChoiceP).toFixed(2));
        probabilities[opt] = Math.max(0, remaining);
      } else {
        const p = parseFloat((rawScores[opt] / totalScore).toFixed(2));
        probabilities[opt] = p;
        sumChoiceP += p;
      }
      if (probabilities[opt] > maxProb) {
        maxProb = probabilities[opt];
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
    const count = Math.max(2, levels.length);
    let estimatedLevel = 0;

    const isHighSeverity = stateLower.includes('urgent') || stateLower.includes('immediately') || stateLower.includes('angry') || stateLower.includes('cancel') || stateLower.includes('right now') || stateLower.includes('two charges') || stateLower.includes('fail') || stateLower.includes('3 times');
    const isMediumSeverity = stateLower.includes('wrong') || stateLower.includes('delay') || stateLower.includes('frustrated') || stateLower.includes('can i');
    const isAmbiguous = stateLower.includes('maybe') || stateLower.includes('confused') || stateLower.includes('not sure');

    if (isHighSeverity) {
      estimatedLevel = count - 1;
    } else if (isMediumSeverity) {
      estimatedLevel = Math.min(count - 1, Math.max(0, Math.floor(count / 2)));
    } else {
      estimatedLevel = 0;
    }

    const peakProb = isAmbiguous ? 0.45 : (isHighSeverity ? 0.85 : 0.72);
    const remainder = Math.max(0, 1.0 - peakProb);
    const adjacentProb = parseFloat((remainder / (count > 2 ? 2 : 1)).toFixed(2));

    const probabilities: Record<string, number> = {};
    let sumScoreP = 0;

    for (let i = 0; i < count; i++) {
      if (i === count - 1) {
        probabilities[String(i)] = parseFloat(Math.max(0, 1.0 - sumScoreP).toFixed(2));
      } else {
        let p = 0.0;
        if (i === estimatedLevel) {
          p = peakProb;
        } else if (Math.abs(i - estimatedLevel) === 1) {
          p = adjacentProb;
        }
        probabilities[String(i)] = p;
        sumScoreP += p;
      }
    }

    let calculatedScore = 0;
    for (let i = 0; i < count; i++) {
      calculatedScore += i * (probabilities[String(i)] || 0);
    }

    const sortedProbs = Object.values(probabilities).sort((a, b) => b - a);
    const pTop = sortedProbs[0] || 0;
    const pSecond = sortedProbs[1] || 0;
    const scoreConfidence = parseFloat(Math.min(0.98, Math.max(0.15, (pTop - pSecond) + (pTop * 0.35))).toFixed(2));

    const legend = levels.reduce<Record<string, string>>((acc, l, idx) => {
      let desc = 'Level ' + idx;
      if (typeof l === 'string') {
        desc = l;
      } else if (l && typeof l === 'object') {
        desc = (l as any).summary || (l as any).what || ((l as any).signals ? (l as any).signals.join(', ') : 'Level ' + idx);
      }
      return { ...acc, [String(idx)]: desc };
    }, {});

    return {
      type: 'score',
      score: parseFloat(calculatedScore.toFixed(2)),
      confidence: scoreConfidence,
      probabilities,
      legend
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
