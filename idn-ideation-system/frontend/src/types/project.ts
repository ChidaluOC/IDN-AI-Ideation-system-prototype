import type { NarrativeFormat, StoryEdge, StoryNode } from './graph'
import type { AIMessage } from './ai'

export interface ProjectMeta {
  id: string
  title: string
  theme: string
  format: NarrativeFormat
  created_at: string
  updated_at: string
  node_count: number
}

export interface Project {
  id: string
  title: string
  theme: string
  format: NarrativeFormat
  created_at: string
  updated_at: string
  nodes: StoryNode[]
  edges: StoryEdge[]
  chat_history: AIMessage[]
}
