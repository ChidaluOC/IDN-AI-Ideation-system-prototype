import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useGraphStore } from '../../store/graphStore'
import { StoryNode } from './StoryNode'

const nodeTypes = { storyNode: StoryNode }

// Inner component that uses useReactFlow (must be inside ReactFlow context)
function FocusHandler() {
  const { fitView } = useReactFlow()
  const pendingFocusNodeId = useGraphStore((s) => s.pendingFocusNodeId)
  const clearFocusNode = useGraphStore((s) => s.clearFocusNode)

  useEffect(() => {
    if (pendingFocusNodeId) {
      setTimeout(() => {
        fitView({ nodes: [{ id: pendingFocusNodeId }], duration: 500, padding: 0.6 })
        clearFocusNode()
      }, 50)
    }
  }, [pendingFocusNodeId, fitView, clearFocusNode])

  return null
}

interface GraphCanvasProps {
  onNodeSelect: (id: string | null) => void
}

export function GraphCanvas({ onNodeSelect }: GraphCanvasProps) {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const onNodesChange = useGraphStore((s) => s.onNodesChange)
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange)
  const onConnect = useGraphStore((s) => s.onConnect)
  const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId)

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)
      const selectChange = changes.find((c) => c.type === 'select')
      if (selectChange && selectChange.type === 'select') {
        if (selectChange.selected) {
          setSelectedNodeId(selectChange.id)
          onNodeSelect(selectChange.id)
        } else {
          const stillSelected = nodes.find((n) => n.id !== selectChange.id && (n as any).selected)
          if (!stillSelected) {
            setSelectedNodeId(null)
            onNodeSelect(null)
          }
        }
      }
    },
    [onNodesChange, setSelectedNodeId, onNodeSelect, nodes]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => onEdgesChange(changes),
    [onEdgesChange]
  )

  const handleConnect = useCallback(
    (connection: Connection) => onConnect(connection),
    [onConnect]
  )

  // Validate connections: block outgoing from 'ending', block incoming to 'intro'
  const isValidConnection = useCallback(
    (connection: { source: string | null; target: string | null }) => {
      if (!connection.source || !connection.target) return false
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)
      if (!sourceNode || !targetNode) return false
      // Endings cannot have outgoing connections
      if (sourceNode.data.nodeType === 'ending') return false
      // Intro cannot have incoming connections
      if (targetNode.data.nodeType === 'intro') return false
      return true
    },
    [nodes]
  )

  return (
    <div style={{ flex: 1, width: '100%' }}>
      <ReactFlow
        nodes={nodes as any}
        edges={edges as any}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        minZoom={0.2}
        maxZoom={2}
      >
        <FocusHandler />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls style={{ bottom: 16, left: 16 }} />
        <MiniMap
          style={{ bottom: 16, right: 16 }}
          nodeColor={(n) => {
            const t = (n.data as any)?.nodeType
            const map: Record<string, string> = {
              intro: '#f97316',
              scene: '#3b82f6',
              choice: '#ca8a04',
              ending: '#16a34a',
              question: '#9333ea',
              note: '#6b7280',
            }
            return map[t] ?? '#9ca3af'
          }}
          maskColor="rgba(248,248,248,0.85)"
        />
      </ReactFlow>
    </div>
  )
}
