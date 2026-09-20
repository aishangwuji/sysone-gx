import { create } from 'zustand';
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Connection, addEdge } from '@xyflow/react';
import { Question, BatchNodeData, ActionNodeData, SimulationTrace } from '../types/workflow';
import { SUPPORT_TRIAGE_NODES, SUPPORT_TRIAGE_EDGES, PRESET_STATES } from '../utils/defaultTemplates';
import { Language, translations } from '../i18n/translations';

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedQuestionId: string | null;
  testStateInput: string;
  apiKey: string;
  isSimulating: boolean;
  simulationTrace: SimulationTrace | null;
  activeEdgeIds: string[];
  activeNodeIds: string[];
  language: Language;

  setLanguage: (lang: Language) => void;
  t: typeof translations['en'];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (nodeId: string | null, questionId?: string | null) => void;
  setTestStateInput: (input: string) => void;
  setApiKey: (key: string) => void;
  setSimulationTrace: (trace: SimulationTrace | null) => void;
  setIsSimulating: (sim: boolean) => void;

  addBatchNode: () => void;
  addActionNode: () => void;
  updateBatchNodeData: (nodeId: string, data: Partial<BatchNodeData>) => void;
  updateActionNodeData: (nodeId: string, data: Partial<ActionNodeData>) => void;
  addQuestionToBatch: (nodeId: string, questionType: 'choice' | 'score' | 'noul') => void;
  updateQuestionInBatch: (nodeId: string, questionId: string, updated: Partial<Question>) => void;
  removeQuestionFromBatch: (nodeId: string, questionId: string) => void;
  deleteNode: (nodeId: string) => void;
  loadTemplate: (templateId: string) => void;
  clearSimulation: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: SUPPORT_TRIAGE_NODES,
  edges: SUPPORT_TRIAGE_EDGES,
  selectedNodeId: 'batch_primary',
  selectedQuestionId: 'department',
  testStateInput: PRESET_STATES[0].state,
  apiKey: '',
  isSimulating: false,
  simulationTrace: null,
  activeEdgeIds: [],
  activeNodeIds: [],
  language: 'zh',
  t: translations['zh'],

  setLanguage: (language: Language) => set({
    language,
    t: translations[language]
  }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const newEdge: Edge = {
      ...connection,
      id: 'edge_' + Date.now(),
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#E551BA', strokeWidth: 2 }
    };
    set({ edges: addEdge(newEdge, get().edges) });
  },

  selectNode: (nodeId, questionId = null) => {
    set({
      selectedNodeId: nodeId,
      selectedQuestionId: questionId
    });
  },

  setTestStateInput: (input) => set({ testStateInput: input }),
  setApiKey: (key) => set({ apiKey: key }),
  setSimulationTrace: (trace) => {
    set({
      simulationTrace: trace,
      activeEdgeIds: trace ? trace.activeEdgeIds : [],
      activeNodeIds: trace ? trace.visitedNodeIds : []
    });
  },
  setIsSimulating: (isSimulating) => set({ isSimulating }),

  addBatchNode: () => {
    const id = 'batch_' + Date.now().toString().slice(-4);
    const newNode: Node = {
      id,
      type: 'batchNode',
      position: { x: 300 + Math.random() * 80, y: 200 + Math.random() * 80 },
      data: {
        title: 'New Evaluation Batch',
        description: 'Single parallel API call batch',
        model: 'jev-latest',
        enableConfidenceFallback: true,
        confidenceThreshold: 0.35,
        questions: [
          {
            id: 'question_' + Date.now().toString().slice(-3),
            type: 'choice',
            instructions: 'Select the best matching category',
            criteria: {
              option_a: 'First scenario description',
              option_b: 'Second scenario description'
            }
          }
        ]
      } as BatchNodeData
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
      selectedQuestionId: (newNode.data as BatchNodeData).questions[0].id
    });
  },

  addActionNode: () => {
    const id = 'action_' + Date.now().toString().slice(-4);
    const newNode: Node = {
      id,
      type: 'actionNode',
      position: { x: 650 + Math.random() * 80, y: 350 + Math.random() * 80 },
      data: {
        title: 'New External Action',
        actionType: 'webhook',
        config: {
          endpoint: 'https://api.internal.com/dispatch',
          message: 'Triggered from workflow completion'
        }
      } as ActionNodeData
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
      selectedQuestionId: null
    });
  },

  updateBatchNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data }
          };
        }
        return node;
      })
    });
  },

  updateActionNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data }
          };
        }
        return node;
      })
    });
  },

  addQuestionToBatch: (nodeId, questionType) => {
    const qId = questionType + '_' + Date.now().toString().slice(-3);
    let newQuestion: Question;
    if (questionType === 'choice') {
      newQuestion = {
        id: qId,
        type: 'choice',
        instructions: 'What category does this input belong to?',
        criteria: {
          category_one: 'Description of category one',
          category_two: 'Description of category two'
        }
      };
    } else if (questionType === 'score') {
      newQuestion = {
        id: qId,
        type: 'score',
        instructions: 'Rate the severity or degree of this condition',
        criteria: ['Low / None', 'Moderate', 'Critical / High']
      };
    } else {
      newQuestion = {
        id: qId,
        type: 'noul',
        instructions: 'Does this condition hold true?',
        criteria: {
          true: 'Evidence explicitly supports the statement',
          false: 'No evidence found'
        }
      };
    }

    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId && n.type === 'batchNode') {
          const bData = n.data as BatchNodeData;
          return {
            ...n,
            data: {
              ...bData,
              questions: [...bData.questions, newQuestion]
            }
          };
        }
        return n;
      }),
      selectedQuestionId: qId
    });
  },

  updateQuestionInBatch: (nodeId, questionId, updated) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId && n.type === 'batchNode') {
          const bData = n.data as BatchNodeData;
          return {
            ...n,
            data: {
              ...bData,
              questions: bData.questions.map((q) => (q.id === questionId ? ({ ...q, ...updated } as Question) : q))
            }
          };
        }
        return n;
      })
    });
  },

  removeQuestionFromBatch: (nodeId, questionId) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId && n.type === 'batchNode') {
          const bData = n.data as BatchNodeData;
          return {
            ...n,
            data: {
              ...bData,
              questions: bData.questions.filter((q) => q.id !== questionId)
            }
          };
        }
        return n;
      }),
      selectedQuestionId: null
    });
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: null,
      selectedQuestionId: null
    });
  },

  loadTemplate: () => {
    set({
      nodes: SUPPORT_TRIAGE_NODES,
      edges: SUPPORT_TRIAGE_EDGES,
      selectedNodeId: 'batch_primary',
      selectedQuestionId: 'department',
      simulationTrace: null,
      activeEdgeIds: [],
      activeNodeIds: []
    });
  },

  clearSimulation: () => {
    set({
      simulationTrace: null,
      activeEdgeIds: [],
      activeNodeIds: [],
      nodes: get().nodes.map((n) => {
        const d = { ...n.data };
        delete d.simulationResult;
        return { ...n, data: d };
      })
    });
  }
}));
