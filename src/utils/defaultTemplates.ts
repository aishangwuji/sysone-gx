import { Node, Edge } from '@xyflow/react';
import { BatchNodeData, ActionNodeData } from '../types/workflow';

export const SUPPORT_TRIAGE_NODES: Node[] = [
  {
    id: 'batch_primary',
    type: 'batchNode',
    position: { x: 80, y: 120 },
    data: {
      title: '1. Primary Classification & Sentiment',
      description: 'Single-call parallel batch: classifies intent, frustration, and escalation need',
      model: 'jev-latest',
      enableConfidenceFallback: true,
      confidenceRange: [0.30, 0.70],
      confidenceThreshold: 0.70,
      questions: [
        {
          id: 'department',
          type: 'choice',
          instructions: 'Which department should handle this ticket?',
          criteria: {
            returns: {
              what: 'Exchanges, wrong size, or damaged items',
              examples: ['I got size 8 instead of 10', 'The box was torn and shoes stained']
            },
            shipping: {
              what: 'Delivery delays, lost tracking, package status',
              examples: ['Tracking stuck for 2 weeks', 'Package marked delivered but not here']
            },
            billing: {
              what: 'Duplicate charges, invoices, subscription payment questions',
              examples: ['Charged twice for order A-104', 'Need an official tax receipt']
            }
          }
        },
        {
          id: 'frustration',
          type: 'score',
          instructions: 'How frustrated or angry does the customer appear?',
          criteria: [
            'Calm and neutral; just stating facts',
            'Frustrated but polite and civil',
            'Very angry; strong language or threatening to cancel'
          ]
        },
        {
          id: 'wants_human',
          type: 'noul',
          instructions: 'Is the customer explicitly demanding to speak with a human agent?',
          criteria: {
            true: 'Mentions speaking with an agent, person, supervisor, or representative',
            false: 'Normal inquiry without demanding human takeover'
          }
        }
      ]
    } as BatchNodeData
  },
  {
    id: 'batch_returns',
    type: 'batchNode',
    position: { x: 620, y: 40 },
    data: {
      title: '2. Return Reason Speculation',
      description: 'Speculative inspection on return reason to auto-approve RMA',
      model: 'jev-latest',
      enableConfidenceFallback: false,
      questions: [
        {
          id: 'return_reason',
          type: 'choice',
          instructions: 'Why does the customer want to return or swap the product?',
          criteria: {
            wrong_size: "The item doesn't fit, customer needs different size",
            damaged: "The item arrived broken, scratched, or defective",
            changed_mind: "Customer simply no longer wants it"
          }
        }
      ]
    } as BatchNodeData
  },
  {
    id: 'action_human_review',
    type: 'actionNode',
    position: { x: 620, y: 440 },
    data: {
      title: 'Escalate to Tier-2 Agent',
      actionType: 'human_review',
      config: {
        team: 'VIP Support Escalation',
        prompt: 'Assigned due to high customer frustration, low classification confidence, or direct human request.'
      }
    } as ActionNodeData
  },
  {
    id: 'action_auto_rma',
    type: 'actionNode',
    position: { x: 1100, y: 40 },
    data: {
      title: 'Issue Prepaid Return Label',
      actionType: 'webhook',
      config: {
        endpoint: 'https://api.store.internal/v1/rma/create',
        message: 'Auto-approved return label generated for size exchange.'
      }
    } as ActionNodeData
  },
  {
    id: 'action_billing',
    type: 'actionNode',
    position: { x: 620, y: 260 },
    data: {
      title: 'Finance Triage Queue',
      actionType: 'database_update',
      config: {
        status: 'PENDING_REFUND_AUDIT',
        team: 'Accounting & Billing'
      }
    } as ActionNodeData
  }
];

export const SUPPORT_TRIAGE_EDGES: Edge[] = [
  // Low confidence fallback from primary batch
  {
    id: 'edge_fallback_primary',
    source: 'batch_primary',
    sourceHandle: 'fallback_handle',
    target: 'action_human_review',
    label: 'Low Conf (< 0.38)',
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#F59E0B', strokeWidth: 2, strokeDasharray: '4 4' }
  },
  // Choice returns -> Returns batch
  {
    id: 'edge_returns',
    source: 'batch_primary',
    sourceHandle: 'q_department_returns',
    target: 'batch_returns',
    label: 'Returns',
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#E551BA', strokeWidth: 2 }
  },
  // Choice billing -> Billing action
  {
    id: 'edge_billing',
    source: 'batch_primary',
    sourceHandle: 'q_department_billing',
    target: 'action_billing',
    label: 'Billing',
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#38BDF8', strokeWidth: 2 }
  },
  // Return reason wrong_size -> Auto RMA
  {
    id: 'edge_auto_rma',
    source: 'batch_returns',
    sourceHandle: 'q_return_reason_wrong_size',
    target: 'action_auto_rma',
    label: 'Wrong Size',
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#10B981', strokeWidth: 2 }
  }
];

export const PRESET_STATES = [
  {
    name: 'Wrong Size Shoes (Exchange Needed)',
    state: 'My running shoes arrived in the wrong size. Can I swap them for a size 10? The box is unopened.'
  },
  {
    name: 'Duplicate Charges & Very Angry',
    state: 'I see TWO charges of  on my statement! I have contacted support 3 times already. Let me talk to a real person right now!'
  },
  {
    name: 'Ambiguous Delivery / Late Package',
    state: 'It has been 10 days since tracking updated, but maybe it got delivered to my neighbor? Should I wait or ask for a replacement?'
  }
];
