export type NodeType = 'intro' | 'scene' | 'choice' | 'ending' | 'question'
export type NarrativeFormat = 'branching' | 'hypertext'

export interface StoryChoice {
  id: string
  label: string
  targetNodeId: string | null
}

export interface StoryNodeData {
  title: string
  body: string
  description?: string     // short author description (not shown to audience)
  personalNote?: string    // private author notes
  nodeType: NodeType
  tags: string[]
  aiGenerated: boolean
  pending?: boolean
  navigationMode?: 'next' | 'choices'   // for scene nodes
  choices?: StoryChoice[]               // for choice nodes
}

export interface StoryNode {
  id: string
  type: 'storyNode'
  position: { x: number; y: number }
  data: StoryNodeData
}

export interface StoryEdge {
  id: string
  source: string
  target: string
  label: string
  type?: string
}

// Returned by the generate-narrative endpoint before conversion to StoryNode/StoryEdge
export interface GeneratedNode {
  id: string
  title: string
  body: string
  node_type: string
  tags: string[]
  x: number
  y: number
}

export interface GeneratedEdge {
  id: string
  source: string
  target: string
  label: string
}
