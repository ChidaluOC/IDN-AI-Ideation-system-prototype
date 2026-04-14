import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  addEdge,
} from '@xyflow/react'
import type { StoryNode, StoryEdge, StoryNodeData, StoryChoice } from '../types/graph'

interface GraphState {
  nodes: StoryNode[]
  edges: StoryEdge[]
  selectedNodeId: string | null
  isDirty: boolean
  preGenSnapshot: { nodes: StoryNode[]; edges: StoryEdge[] } | null
  pendingFocusNodeId: string | null

  setNodes: (nodes: StoryNode[]) => void
  setEdges: (edges: StoryEdge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (nodeType: StoryNode['data']['nodeType'], position?: { x: number; y: number }) => void
  createNode: (nodeType: StoryNode['data']['nodeType'], position?: { x: number; y: number }) => string
  addAINode: (nodeType: StoryNode['data']['nodeType'], position?: { x: number; y: number }, overrideData?: Partial<Pick<StoryNodeData, 'title' | 'body' | 'tags'>>) => string
  addConnectedChoiceNode: (sceneNodeId: string, choices: StoryChoice[]) => string
  updateNodeData: (id: string, data: Partial<StoryNodeData>) => void
  removeNode: (id: string) => void
  setSelectedNodeId: (id: string | null) => void
  setIsDirty: (v: boolean) => void
  loadGraph: (nodes: StoryNode[], edges: StoryEdge[]) => void
  proposePendingGraph: (nodes: StoryNode[], edges: StoryEdge[], replace: boolean) => void
  confirmPendingGraph: () => void
  rejectPendingGraph: () => void
  ensureEdge: (source: string, target: string) => void
  removeEdgesWhere: (predicate: (e: StoryEdge) => boolean) => void
  requestFocusNode: (id: string) => void
  clearFocusNode: () => void
}

let nodeCounter = 1
let aiNodeCounter = 1

function initCountersFromNodes(nodes: StoryNode[]) {
  for (const node of nodes) {
    if (node.id.startsWith('G')) {
      const num = parseInt(node.id.slice(1), 10)
      if (!isNaN(num) && num >= aiNodeCounter) aiNodeCounter = num + 1
    } else {
      const num = parseInt(node.id, 10)
      if (!isNaN(num) && num >= nodeCounter) nodeCounter = num + 1
    }
  }
}

const NODE_LABELS: Record<string, string> = {
  intro: 'Introduction',
  scene: 'New Scene',
  choice: 'Choices',
  ending: 'Ending',
  question: 'Question',
}

function makeNodeData(nodeType: StoryNode['data']['nodeType'], overrides?: Partial<StoryNodeData>): StoryNodeData {
  return {
    title: NODE_LABELS[nodeType] ?? 'New Node',
    body: '',
    description: '',
    personalNote: '',
    nodeType,
    tags: [],
    aiGenerated: false,
    navigationMode: nodeType === 'scene' ? 'next' : undefined,
    choices: nodeType === 'choice' ? [] : undefined,
    ...overrides,
  }
}

export const useGraphStore = create<GraphState>()(
  immer((set) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    isDirty: false,
    preGenSnapshot: null,
    pendingFocusNodeId: null,

    setNodes: (nodes) => set((s) => { s.nodes = nodes as any }),
    setEdges: (edges) => set((s) => { s.edges = edges as any }),

    onNodesChange: (changes) =>
      set((s) => {
        s.nodes = applyNodeChanges(changes, s.nodes as any) as any
        s.isDirty = true
      }),

    onEdgesChange: (changes) =>
      set((s) => {
        s.edges = applyEdgeChanges(changes, s.edges as any) as any
        s.isDirty = true
      }),

    onConnect: (connection) =>
      set((s) => {
        const newEdge = {
          ...connection,
          id: `e-${Date.now()}`,
          label: '',
          type: 'default',
        }
        s.edges = addEdge(newEdge, s.edges as any) as any
        s.isDirty = true
      }),

    addNode: (nodeType, position) => {
      const id = String(nodeCounter++)
      const pos = position ?? { x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 }
      set((s) => {
        s.nodes.push({
          id,
          type: 'storyNode',
          position: pos,
          data: makeNodeData(nodeType),
        } as any)
        s.isDirty = true
      })
    },

    createNode: (nodeType, position) => {
      const id = String(nodeCounter++)
      const pos = position ?? { x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 }
      set((s) => {
        s.nodes.push({
          id,
          type: 'storyNode',
          position: pos,
          data: makeNodeData(nodeType),
        } as any)
        s.isDirty = true
      })
      return id
    },

    addAINode: (nodeType, position, overrideData) => {
      const id = `G${aiNodeCounter++}`
      const pos = position ?? { x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 }
      set((s) => {
        const base = makeNodeData(nodeType)
        s.nodes.push({
          id,
          type: 'storyNode',
          position: pos,
          data: {
            ...base,
            title: overrideData?.title ?? base.title,
            body: overrideData?.body ?? base.body,
            tags: overrideData?.tags ?? base.tags,
            aiGenerated: true,
          },
        } as any)
        s.isDirty = true
      })
      return id
    },

    addConnectedChoiceNode: (sceneNodeId, choices) => {
      const id = String(nodeCounter++)
      set((s) => {
        const sceneNode = s.nodes.find((n) => n.id === sceneNodeId)
        const pos = sceneNode
          ? { x: sceneNode.position.x, y: sceneNode.position.y + 200 }
          : { x: 300, y: 300 }
        s.nodes.push({
          id,
          type: 'storyNode',
          position: pos,
          data: makeNodeData('choice', { choices }),
        } as any)
        s.edges.push({
          id: `e-${Date.now()}`,
          source: sceneNodeId,
          target: id,
          label: '',
          type: 'default',
        } as any)
        s.isDirty = true
      })
      return id
    },

    updateNodeData: (id, data) =>
      set((s) => {
        const node = s.nodes.find((n) => n.id === id)
        if (node) {
          Object.assign(node.data, data)
          s.isDirty = true
        }
      }),

    removeNode: (id) =>
      set((s) => {
        s.nodes = s.nodes.filter((n) => n.id !== id)
        s.edges = s.edges.filter((e) => e.source !== id && e.target !== id)
        if (s.selectedNodeId === id) s.selectedNodeId = null
        s.isDirty = true
      }),

    setSelectedNodeId: (id) => set((s) => { s.selectedNodeId = id }),
    setIsDirty: (v) => set((s) => { s.isDirty = v }),

    loadGraph: (nodes, edges) => {
      initCountersFromNodes(nodes)
      set((s) => {
        s.nodes = nodes as any
        s.edges = edges as any
        s.isDirty = false
        s.preGenSnapshot = null
      })
    },

    proposePendingGraph: (newNodes, newEdges, replace) => {
      set((s) => {
        s.preGenSnapshot = {
          nodes: JSON.parse(JSON.stringify(s.nodes)),
          edges: JSON.parse(JSON.stringify(s.edges)),
        }
        const pendingNodes = newNodes.map((n) => ({ ...n, data: { ...n.data, pending: true } } as any))
        const pendingEdges = newEdges.map((e) => ({ ...e } as any))
        if (replace) {
          s.nodes = pendingNodes
          s.edges = pendingEdges
        } else {
          s.nodes = [...(s.nodes as any), ...pendingNodes]
          s.edges = [...(s.edges as any), ...pendingEdges]
        }
        s.isDirty = true
      })
      initCountersFromNodes(newNodes)
    },

    confirmPendingGraph: () => {
      set((s) => {
        s.nodes = (s.nodes as any).map((n: any) => {
          if (n.data.pending) {
            const { pending: _p, ...data } = n.data
            return { ...n, data }
          }
          return n
        })
        s.preGenSnapshot = null
        s.isDirty = true
      })
    },

    rejectPendingGraph: () => {
      set((s) => {
        if (s.preGenSnapshot) {
          s.nodes = s.preGenSnapshot.nodes as any
          s.edges = s.preGenSnapshot.edges as any
          s.preGenSnapshot = null
          s.isDirty = true
        }
      })
    },

    ensureEdge: (source, target) =>
      set((s) => {
        const exists = (s.edges as any[]).some(
          (e) => e.source === source && e.target === target
        )
        if (!exists) {
          s.edges.push({
            id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source,
            target,
            label: '',
            type: 'default',
          } as any)
          s.isDirty = true
        }
      }),

    removeEdgesWhere: (predicate) =>
      set((s) => {
        const before = s.edges.length
        s.edges = s.edges.filter((e) => !predicate(e as any)) as any
        if (s.edges.length !== before) s.isDirty = true
      }),

    requestFocusNode: (id) => set((s) => { s.pendingFocusNodeId = id }),
    clearFocusNode: () => set((s) => { s.pendingFocusNodeId = null }),
  }))
)
