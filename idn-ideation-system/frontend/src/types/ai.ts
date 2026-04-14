export interface SearchSource {
  title: string
  url: string
  snippet: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: SearchSource[]
}

export interface BranchSuggestion {
  id: string
  title: string
  body: string
  reasoning: string
  suggested_edge_label: string
  dismissed?: boolean
}

export interface ThemeAnalysis {
  dominant_angle: string
  framing_biases: string[]
  underrepresented_perspectives: string[]
  reasoning: string
}

export interface CoherenceIssue {
  node_id?: string
  issue_type: 'orphan' | 'dead_end' | 'thematic_drift' | 'structural'
  description: string
  suggestion: string
}

export interface PerspectiveSuggestion {
  perspective_label: string
  rationale: string
  suggested_nodes: BranchSuggestion[]
}

export type AIMode = 'live' | 'mock'
export type CoAuthorMode = 'ideate' | 'generate'
export type GenerationState = 'idle' | 'awaiting_scope' | 'generating' | 'pending_confirmation'
