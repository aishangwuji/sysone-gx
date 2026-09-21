import { create } from 'zustand';
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Connection, addEdge } from '@xyflow/react';
import { Question, BatchNodeData, ActionNodeData, SimulationTrace } from '../types/workflow';
import { Language, translations } from '../i18n/translations';

import { projectsApi } from '../api/client';
import { validateWorkflow } from '../../shared/validateWorkflow';

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedQuestionId: string | null;
  testStateInput: string;
  isSimulating: boolean;
  simulationTrace: SimulationTrace | null;
  activeEdgeIds: string[];
  activeNodeIds: string[];
  language: Language;

  // 项目管理状态
  currentProjectId: string | null;
  currentProjectName: string;
  currentProjectDesc: string;
  isProjectManagerOpen: boolean;
  isSaving: boolean;
  projectsList: any[];

  setLanguage: (lang: Language) => void;
  t: typeof translations['en'];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  selectNode: (nodeId: string | null, questionId?: string | null) => void;
  setTestStateInput: (input: string) => void;
  setSimulationTrace: (trace: SimulationTrace | null) => void;
  setIsSimulating: (sim: boolean) => void;

  openProjectManager: () => void;
  closeProjectManager: () => void;
  fetchUserProjects: () => Promise<any[]>;
  loadProjectById: (id: string) => Promise<void>;
  createNewProject: (params: { name: string; description?: string; templateType?: string }) => Promise<void>;
  saveCurrentProject: () => Promise<void>;
  deleteProjectById: (id: string) => Promise<void>;

  addBatchNode: () => void;
  addActionNode: () => void;
  updateBatchNodeData: (nodeId: string, data: Partial<BatchNodeData>) => void;
  updateActionNodeData: (nodeId: string, data: Partial<ActionNodeData>) => void;
  addQuestionToBatch: (nodeId: string, questionType: 'choice' | 'score' | 'noul') => void;
  updateQuestionInBatch: (nodeId: string, questionId: string, updated: Partial<Question>) => void;
  removeQuestionFromBatch: (nodeId: string, questionId: string) => void;
  mergeDownstreamBatch: (upstreamNodeId: string, downstreamNodeId: string) => void;
  deleteNode: (nodeId: string) => void;
  loadTemplate: (templateId: string) => void;
  clearSimulation: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedQuestionId: null,
  testStateInput: '',
  isSimulating: false,
  simulationTrace: null,
  activeEdgeIds: [],
  activeNodeIds: [],
  language: 'zh',
  t: translations['zh'],

  currentProjectId: null,
  currentProjectName: '未命名决策流',
  currentProjectDesc: '',
  isProjectManagerOpen: false,
  isSaving: false,
  projectsList: [],

  openProjectManager: () => set({ isProjectManagerOpen: true }),
  closeProjectManager: () => set({ isProjectManagerOpen: false }),

  fetchUserProjects: async () => {
    try {
      const list = await projectsApi.list();
      set({ projectsList: list });
      return list;
    } catch (err) {
      console.warn('Fetch projects failed:', err);
      return [];
    }
  },

  loadProjectById: async (id: string) => {
    const proj = await projectsApi.getById(id);
    const wf = proj.workflowData || {};
    set({
      currentProjectId: proj.id,
      currentProjectName: proj.name,
      currentProjectDesc: proj.description || '',
      nodes: wf.nodes && wf.nodes.length > 0 ? wf.nodes : [],
      edges: wf.edges || [],
      selectedNodeId: wf.nodes?.[0]?.id || null,
      selectedQuestionId: null,
      simulationTrace: null
    });
  },

  createNewProject: async (params) => {
    const created = await projectsApi.create({
      ...params,
      workflowData: { nodes: [], edges: [] }
    });
    await get().fetchUserProjects();
    await get().loadProjectById(created.id);
  },

  saveCurrentProject: async () => {
    const { currentProjectId, currentProjectName, nodes, edges } = get();
    const wfData = { nodes, edges };

    // TD-2026-006: 客户端预先校验，发现脏数据直接弹错拦截，不发无效请求
    const validation = validateWorkflow(wfData);
    if (!validation.valid) {
      const errHeader = '工作流数据规范校验未通过，无法保存：';
      const issues = validation.errors.slice(0, 3).map((e) => `• ${e}`).join('\n');
      const more = validation.errors.length > 3 ? `\n...等共 ${validation.errors.length} 项规范错误` : '';
      alert(`${errHeader}\n\n${issues}${more}`);
      console.warn('[Workflow Validator] 校验未通过:', validation.errors);
      return;
    }

    if (!currentProjectId) {
      // 未绑定项目时自动新建
      const created = await projectsApi.create({
        name: currentProjectName || '新建决策树项目',
        workflowData: wfData
      });
      set({ currentProjectId: created.id });
      await get().fetchUserProjects();
      return;
    }

    set({ isSaving: true });
    try {
      await projectsApi.update(currentProjectId, {
        workflowData: wfData
      });
      set({ isSaving: false });
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },

  deleteProjectById: async (id: string) => {
    await projectsApi.delete(id);
    if (get().currentProjectId === id) {
      set({
        currentProjectId: null,
        currentProjectName: '未命名决策流',
        nodes: [],
        edges: []
      });
    }
  },

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
        title: '',
        description: '',
        model: 'jev-latest',
        enableConfidenceFallback: false,
        confidenceRange: [0.30, 0.70],
        confidenceThreshold: 0.70,
        questions: []
      } as BatchNodeData
    };
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
      selectedQuestionId: null
    });
  },

  addActionNode: () => {
    const id = 'action_' + Date.now().toString().slice(-4);
    const newNode: Node = {
      id,
      type: 'actionNode',
      position: { x: 650 + Math.random() * 80, y: 350 + Math.random() * 80 },
      data: {
        title: '',
        actionType: 'webhook',
        config: {
          endpoint: '',
          message: ''
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
    const qUid = 'q_' + Math.random().toString(36).slice(2, 9);
    let newQuestion: Question;
    if (questionType === 'choice') {
      newQuestion = {
        _uid: qUid,
        id: '',
        type: 'choice',
        instructions: '',
        criteria: {}
      };
    } else if (questionType === 'score') {
      newQuestion = {
        _uid: qUid,
        id: '',
        type: 'score',
        instructions: '',
        criteria: []
      };
    } else {
      newQuestion = {
        _uid: qUid,
        id: '',
        type: 'noul',
        instructions: '',
        criteria: {
          true: '',
          false: ''
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
      selectedQuestionId: qUid
    });
  },

  updateQuestionInBatch: (nodeId, questionKey, updated) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId && n.type === 'batchNode') {
          const bData = n.data as BatchNodeData;
          return {
            ...n,
            data: {
              ...bData,
              questions: bData.questions.map((q) => {
                const isMatch = (q._uid && q._uid === questionKey) || q.id === questionKey;
                return isMatch ? ({ ...q, ...updated } as Question) : q;
              })
            }
          };
        }
        return n;
      })
    });
  },

  removeQuestionFromBatch: (nodeId, questionKey) => {
    set({
      nodes: get().nodes.map((n) => {
        if (n.id === nodeId && n.type === 'batchNode') {
          const bData = n.data as BatchNodeData;
          return {
            ...n,
            data: {
              ...bData,
              questions: bData.questions.filter((q) => !((q._uid && q._uid === questionKey) || q.id === questionKey))
            }
          };
        }
        return n;
      }),
      selectedQuestionId: null
    });
  },

  mergeDownstreamBatch: (upstreamNodeId, downstreamNodeId) => {
    const { nodes, edges } = get();
    const upNode = nodes.find((n) => n.id === upstreamNodeId);
    const downNode = nodes.find((n) => n.id === downstreamNodeId);
    if (!upNode || !downNode) return;

    const upData = upNode.data as unknown as BatchNodeData;
    const downData = downNode.data as unknown as BatchNodeData;
    if (!upData?.questions || !downData?.questions) return;

    const existingQIds = new Set(upData.questions.map((q) => q.id));
    const mergedQuestions = [...upData.questions];

    downData.questions.forEach((dq) => {
      let finalQId = dq.id;
      if (existingQIds.has(finalQId)) {
        finalQId = `${downNode.id}_${dq.id}`;
      }
      mergedQuestions.push({ ...dq, id: finalQId });
    });

    // Re-route outgoing edges from downstreamNode to upstreamNode
    const newEdges = edges
      .filter((e) => !(e.source === upstreamNodeId && e.target === downstreamNodeId))
      .map((e) => {
        if (e.source === downstreamNodeId) {
          return {
            ...e,
            source: upstreamNodeId
          };
        }
        return e;
      });

    // Remove downstream node and update upstream node questions
    const newNodes = nodes
      .filter((n) => n.id !== downstreamNodeId)
      .map((n) => {
        if (n.id === upstreamNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              questions: mergedQuestions
            }
          };
        }
        return n;
      });

    set({
      nodes: newNodes,
      edges: newEdges,
      selectedNodeId: upstreamNodeId
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
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedQuestionId: null,
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
