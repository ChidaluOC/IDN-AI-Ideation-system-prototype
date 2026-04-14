import { useState, useEffect } from 'react'
import { X, ChevronRight, RotateCcw, ChevronDown } from 'lucide-react'
import { useGraphStore } from '../../store/graphStore'
import type { StoryNode, StoryChoice } from '../../types/graph'

interface PreviewModalProps {
  onClose: () => void
}

export function PreviewModal({ onClose }: PreviewModalProps) {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [startPickerOpen, setStartPickerOpen] = useState(false)

  // Find the starting node when the modal opens
  useEffect(() => {
    setCurrentNodeId(findStartNode(nodes, edges))
    setHistory([])
  }, [])

  const currentNode = nodes.find((n) => n.id === currentNodeId) ?? null

  // Navigation helpers
  function navigate(targetId: string) {
    setHistory((h) => (currentNodeId ? [...h, currentNodeId] : h))
    setCurrentNodeId(targetId)
  }

  function goBack() {
    const prev = history[history.length - 1]
    if (prev) {
      setHistory((h) => h.slice(0, -1))
      setCurrentNodeId(prev)
    }
  }

  function restart() {
    setCurrentNodeId(findStartNode(nodes, edges))
    setHistory([])
  }

  // Determine what navigation to show
  const navInfo = getNavigation(currentNode, nodes, edges)

  const sceneNodes = nodes.filter(
    (n) => n.data.nodeType === 'intro' || n.data.nodeType === 'scene' || n.data.nodeType === 'ending'
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '88vh',
          background: '#fafaf9',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid #e5e7eb',
            background: '#fff',
            flexShrink: 0,
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
              color: '#9ca3af',
              textTransform: 'uppercase',
            }}
          >
            Audience Preview
          </span>

          {/* Start node picker */}
          <div style={{ position: 'relative', marginLeft: 8 }}>
            <button
              onClick={() => setStartPickerOpen(!startPickerOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: '#6b7280', background: '#f3f4f6',
                border: '1px solid #e5e7eb', borderRadius: 5,
                padding: '3px 8px', cursor: 'pointer',
              }}
            >
              Start from <ChevronDown size={11} />
            </button>
            {startPickerOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 10,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  minWidth: 200,
                  maxHeight: 220,
                  overflow: 'auto',
                  marginTop: 4,
                }}
              >
                {sceneNodes.length === 0 && (
                  <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af' }}>No scene nodes yet</div>
                )}
                {sceneNodes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setCurrentNodeId(n.id)
                      setHistory([])
                      setStartPickerOpen(false)
                    }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 12px', background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: 12,
                      color: n.id === currentNodeId ? '#3b82f6' : '#374151',
                      fontWeight: n.id === currentNodeId ? 600 : 400,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    {n.data.title || 'Untitled'}{' '}
                    <span style={{ color: '#9ca3af', fontSize: 10 }}>({n.data.nodeType})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={restart}
              title="Restart from beginning"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: '#6b7280', background: 'none',
                border: '1px solid #e5e7eb', borderRadius: 6,
                padding: '5px 10px', cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} /> Restart
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Story content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '40px 48px' }}>
          {!currentNode ? (
            <EmptyState />
          ) : (
            <SceneView node={currentNode} navInfo={navInfo} onNavigate={navigate} />
          )}
        </div>

        {/* Footer navigation */}
        <div
          style={{
            padding: '14px 48px',
            borderTop: '1px solid #e5e7eb',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <button
            onClick={goBack}
            disabled={history.length === 0}
            style={{
              fontSize: 12,
              color: history.length === 0 ? '#d1d5db' : '#6b7280',
              background: 'none',
              border: 'none',
              cursor: history.length === 0 ? 'default' : 'pointer',
            }}
          >
            ← Back
          </button>
          <span style={{ fontSize: 11, color: '#d1d5db' }}>
            {history.length + 1} step{history.length !== 0 ? 's' : ''} in
          </span>
        </div>
      </div>
    </div>
  )
}

// ── SceneView ────────────────────────────────────────────────────────

interface NavInfo {
  type: 'none' | 'next' | 'choices' | 'ending'
  nextNodeId?: string
  choices?: { choice: StoryChoice; node: StoryNode | null }[]
}

interface SceneViewProps {
  node: StoryNode
  navInfo: NavInfo
  onNavigate: (id: string) => void
}

function SceneView({ node, navInfo, onNavigate }: SceneViewProps) {
  const isEnding = node.data.nodeType === 'ending'

  const nodeColor: Record<string, string> = {
    intro: '#f97316',
    scene: '#3b82f6',
    ending: '#16a34a',
    question: '#9333ea',
    choice: '#ca8a04',
    note: '#6b7280',
  }
  const color = nodeColor[node.data.nodeType] ?? '#3b82f6'

  return (
    <div>
      {/* Node type label */}
      <div style={{ marginBottom: 12 }}>
        <span
          style={{
            background: color,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 4,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          }}
        >
          {node.data.nodeType}
        </span>
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#1a1a2e',
          lineHeight: 1.25,
          marginBottom: 20,
        }}
      >
        {node.data.title || 'Untitled'}
      </h2>

      {/* Body text */}
      {node.data.body ? (
        <div
          style={{
            fontSize: 16,
            color: '#374151',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
            marginBottom: 36,
          }}
        >
          {node.data.body}
        </div>
      ) : (
        <div
          style={{
            fontSize: 14,
            color: '#d1d5db',
            fontStyle: 'italic',
            marginBottom: 36,
          }}
        >
          (No content written yet)
        </div>
      )}

      {/* Navigation */}
      {isEnding ? (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 8 }}>—</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#16a34a' }}>End of story</div>
        </div>
      ) : navInfo.type === 'next' && navInfo.nextNodeId ? (
        <div style={{ paddingTop: 8 }}>
          <button
            onClick={() => onNavigate(navInfo.nextNodeId!)}
            style={nextButtonStyle}
          >
            {node.data.nodeType === 'intro' ? 'Begin Story' : 'Continue'} <ChevronRight size={16} />
          </button>
        </div>
      ) : navInfo.type === 'choices' && navInfo.choices && navInfo.choices.length > 0 ? (
        <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
            What do you do?
          </div>
          {navInfo.choices.map(({ choice, node: targetNode }) => (
            <button
              key={choice.id}
              onClick={() => targetNode && onNavigate(targetNode.id)}
              disabled={!targetNode}
              style={choiceButtonStyle(!targetNode)}
            >
              {choice.label || 'Unnamed choice'}
              {!targetNode && (
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>(not connected)</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: '#d1d5db', fontStyle: 'italic', paddingTop: 8 }}>
          No outgoing connections from this node.
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: 60 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📖</div>
      <p style={{ fontSize: 14 }}>No scene nodes found. Add some scenes to preview your story.</p>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

function findStartNode(nodes: StoryNode[], edges: { target: string }[]): string | null {
  // Prefer the intro node
  const introNode = nodes.find((n) => n.data.nodeType === 'intro')
  if (introNode) return introNode.id
  // Fall back to first root scene (no incoming edges)
  const targetIds = new Set(edges.map((e) => e.target))
  const rootNodes = nodes.filter((n) => !targetIds.has(n.id))
  const startNode =
    rootNodes.find((n) => n.data.nodeType === 'scene') ??
    nodes.find((n) => n.data.nodeType === 'scene')
  return startNode?.id ?? null
}

function getNavigation(
  node: StoryNode | null,
  nodes: StoryNode[],
  edges: { source: string; target: string }[]
): NavInfo {
  if (!node) return { type: 'none' }
  if (node.data.nodeType === 'ending') return { type: 'ending' }

  const outEdges = edges.filter((e) => e.source === node.id)

  if (node.data.nodeType === 'scene' && node.data.navigationMode === 'choices') {
    // Find connected choice node
    const choiceEdge = outEdges.find(
      (e) => nodes.find((n) => n.id === e.target)?.data.nodeType === 'choice'
    )
    if (choiceEdge) {
      const choiceNode = nodes.find((n) => n.id === choiceEdge.target)
      const choices = (choiceNode?.data.choices ?? []).map((c) => ({
        choice: c,
        node: nodes.find((n) => n.id === c.targetNodeId) ?? null,
      }))
      return { type: 'choices', choices }
    }
    return { type: 'choices', choices: [] }
  }

  // "next" mode or other node types — follow first non-choice outgoing edge
  const nextEdge = outEdges.find((e) => {
    const target = nodes.find((n) => n.id === e.target)
    return target && target.data.nodeType !== 'choice'
  })

  if (nextEdge) {
    return { type: 'next', nextNodeId: nextEdge.target }
  }

  return { type: 'none' }
}

// ── Styles ──────────────────────────────────────────────────────────

const nextButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '12px 24px',
  borderRadius: 8,
  border: 'none',
  background: '#1a1a2e',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const choiceButtonStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  padding: '14px 20px',
  borderRadius: 10,
  border: `2px solid ${disabled ? '#e5e7eb' : '#ca8a04'}`,
  background: disabled ? '#f9fafb' : '#fffbeb',
  color: disabled ? '#9ca3af' : '#92400e',
  fontSize: 15,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s, border-color 0.15s',
})
