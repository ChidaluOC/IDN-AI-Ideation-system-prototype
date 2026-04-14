import type { AIMessage, BranchSuggestion, CoherenceIssue, PerspectiveSuggestion, ThemeAnalysis } from '../types/ai'
import type { GeneratedEdge, GeneratedNode } from '../types/graph'
import type { Project, ProjectMeta } from '../types/project'
import type { StoryEdge, StoryNode } from '../types/graph'

const BASE = '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${res.status}: ${err}`)
  }
  return res.json()
}

// ─── Projects ────────────────────────────────────────────────────────────────

export const api = {
  projects: {
    list: () => req<ProjectMeta[]>('/projects'),

    create: (title: string, theme: string, format: 'branching' | 'hypertext') =>
      req<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({ title, theme, format }),
      }),

    get: (id: string) => req<Project>(`/projects/${id}`),

    save: (id: string, data: {
      title: string
      theme: string
      format: 'branching' | 'hypertext'
      nodes: StoryNode[]
      edges: StoryEdge[]
      chat_history: AIMessage[]
    }) =>
      req<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      fetch(BASE + `/projects/${id}`, { method: 'DELETE' }),

    exportUrl: (id: string) => BASE + `/projects/${id}/export`,
  },

  ai: {
    status: () => req<{ mode: string }>('/ai/status'),

    branches: (projectId: string, selectedNode: {
      id: string; title: string; body: string; node_type: string
    }, graphContext: object) =>
      req<{ suggestions: BranchSuggestion[]; mode: string }>('/ai/branches', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, selected_node: selectedNode, graph_context: graphContext }),
      }),

    themeAnalysis: (projectId: string, premise: string, graphContext: object) =>
      req<{ analysis: ThemeAnalysis; mode: string }>('/ai/theme-analysis', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, premise, graph_context: graphContext }),
      }),

    coherenceCheck: (projectId: string, nodeDetails: object[], graphContext: object) =>
      req<{ issues: CoherenceIssue[]; overall_assessment: string; mode: string }>('/ai/coherence-check', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, node_details: nodeDetails, graph_context: graphContext }),
      }),

    perspective: (projectId: string, selectedNode: {
      id: string; title: string; body: string; node_type: string
    }, graphContext: object) =>
      req<{ suggestion: PerspectiveSuggestion; mode: string }>('/ai/perspective', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, selected_node: selectedNode, graph_context: graphContext }),
      }),

    generateNarrative: (projectId: string, premise: string) =>
      req<{ nodes: GeneratedNode[]; edges: GeneratedEdge[]; mode: string }>('/ai/generate-narrative', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, premise }),
      }),

    narrativeOverview: (projectId: string, nodeDetails: object[], graphContext: object) =>
      req<{ overview: string; mode: string }>('/ai/narrative-overview', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, node_details: nodeDetails, graph_context: graphContext }),
      }),
  },
}
