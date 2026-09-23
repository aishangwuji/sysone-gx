import { Node, Edge } from '@xyflow/react';
import { BatchNodeData, NoulQuestion, SimulationTrace } from '../types/workflow';
import { DEFAULT_NOUL_YES, DEFAULT_NOUL_NO } from './constants';
import { executeBatchDecision, ProviderConfig } from './decisionService';

/**
 * High-fidelity heuristic simulator for TypeSafe Jev model.
 * Evaluates state input against choice, score, and noul primitives offline safely.
 */
export async function runWorkflowSimulation(
  nodes: Node[],
  edges: Edge[],
  stateInput: string,
  providerConfig?: ProviderConfig
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
  let totalExecutionTime = 0;
  let lastRawResponse = '';
  let totalUsage: SimulationTrace['usage'] = undefined;
  const rejectReasons: string[] = [];
  const reviewReasons: string[] = [];

  logs.push({
    nodeId: rootNode.id,
    type: 'info',
    message: 'Starting simulation evaluation at root: ' + (rootNode.data.title || rootNode.id)
  });

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

      if (!providerConfig) {
        throw new Error('未指定服务商配置 (请选择 OpenRouter 或 TypeSafe)');
      }

      const decisionResult = await executeBatchDecision(
        bData,
        stateInput,
        providerConfig
      );

      totalExecutionTime += decisionResult.executionTimeMs;
      lastRawResponse = decisionResult.rawResponse;
      if (decisionResult.usage) {
        totalUsage = decisionResult.usage;
      }

      const batchAnswers = decisionResult.answers;
      Object.assign(answers, batchAnswers);

      const providerLabel = decisionResult.provider === 'openrouter' ? 'OpenRouter' : 'TypeSafe';

      logs.push({
        nodeId: currentNode.id,
        type: 'info',
        message: `[${providerLabel}] 执行 ${bData.questions.length} 个问询 (${decisionResult.modelUsed}) · 耗时 ${decisionResult.executionTimeMs}ms`
      });

      for (const q of bData.questions) {
        const qAns = batchAnswers[q.id];
        if (!qAns) continue;
        const resSummary = q.type === 'choice' ? qAns.choice : q.type === 'score' ? (qAns.score !== undefined ? qAns.score.toFixed(2) : '') : (qAns.noul !== undefined ? (qAns.noul * 100).toFixed(0) + '%' : '');
        const confSummary = q.type === 'noul'
          ? ' (校准概率 P: ' + ((qAns.noul ?? 0) * 100).toFixed(0) + '%)'
          : qAns.confidence !== undefined
            ? ' (置信度: ' + qAns.confidence.toFixed(2) + ')'
            : '';

        logs.push({
          nodeId: currentNode.id,
          type: 'decision',
          message: '问询 [' + q.id + ' (' + q.type + ')]: 评估结论 = ' + resSummary + confSummary
        });
      }

      let nextNode: Node | undefined = undefined;
      const confRange = bData.confidenceRange ?? [0.30, bData.confidenceThreshold ?? 0.70];
      const [confMin, confMax] = confRange;
      const hasFallbackEdge = edges.find((e) => e.source === currentNode?.id && e.sourceHandle === 'fallback_handle');

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
        reviewReasons.push(fallbackLogReason);
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
                if (edge.target.includes('reject')) {
                  rejectReasons.push(`命中违规分类 [${matchedQ.id}]: 归类为 ${optionKey}`);
                } else if (edge.target.includes('review')) {
                  reviewReasons.push(`命中送审分类 [${matchedQ.id}]: 归类为 ${optionKey}`);
                }
                break;
              } else if (matchedQ.type === 'score') {
                if (Math.round(qAns?.score) === parseInt(optionKey, 10)) {
                  activeEdgeIds.push(edge.id);
                  nextNode = nodeMap.get(edge.target);
                  if (edge.target.includes('reject')) {
                    rejectReasons.push(`评分超标 [${matchedQ.id}]: 档位 ${optionKey}`);
                  } else if (edge.target.includes('review')) {
                    reviewReasons.push(`评分存疑 [${matchedQ.id}]: 档位 ${optionKey}`);
                  }
                  break;
                }
              } else if (matchedQ.type === 'noul') {
                const nq = matchedQ as NoulQuestion;
                const yesT = nq.thresholds?.yes ?? DEFAULT_NOUL_YES;
                const noT = nq.thresholds?.no ?? DEFAULT_NOUL_NO;
                if ((optionKey === 'yes' && (qAns?.noul ?? 0) >= yesT) || (optionKey === 'no' && (qAns?.noul ?? 0) <= noT)) {
                  activeEdgeIds.push(edge.id);
                  nextNode = nodeMap.get(edge.target);
                  if (optionKey === 'yes' && edge.target.includes('reject')) {
                    rejectReasons.push(`命中高概率违规 [${matchedQ.id}]: 概率 ${((qAns?.noul ?? 0) * 100).toFixed(0)}% (>= ${(yesT * 100).toFixed(0)}%)`);
                  }
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
          executionTimeMs: decisionResult.executionTimeMs
        }
      };

      currentNode = nextNode;
    }
  }

  const suggestedAction = finalAction?.title || (rejectReasons.length > 0 ? '建议拦截' : reviewReasons.length > 0 ? '建议人工复核' : '建议放行通过');

  return {
    trace: {
      timestamp: new Date().toISOString(),
      visitedNodeIds,
      activeEdgeIds,
      answers,
      finalAction,
      provider: providerConfig?.provider || 'local',
      executionTimeMs: totalExecutionTime || 45,
      rawResponse: lastRawResponse,
      usage: totalUsage,
      suggestedAction,
      rejectReasons,
      reviewReasons,
      logs
    },
    updatedNodes
  };
}
