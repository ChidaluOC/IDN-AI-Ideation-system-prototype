import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, X, Sparkles } from 'lucide-react'
import { useGraphStore } from '../../store/graphStore'
import { useAIStore } from '../../store/aiStore'
import type { BranchSuggestion } from '../../types/ai'

interface SuggestionCardProps {
  suggestion: BranchSuggestion
  selectedNodeId?: string | null
}

export function SuggestionCard({ suggestion, selectedNodeId }: SuggestionCardProps) {
  const [showReasoning, setShowReasoning] = useState(false)
  const addAINode = useGraphStore((s) => s.addAINode)
  const onConnect = useGraphStore((s) => s.onConnect)
  const nodes = useGraphStore((s) => s.nodes)
  const dismissSuggestion = useAIStore((s) => s.dismissSuggestion)

  if (suggestion.dismissed) return null

  const handleAddToGraph = () => {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId)
    const pos = selectedNode
      ? { x: selectedNode.position.x + 50 + Math.random() * 100, y: selectedNode.position.y + 160 }
      : undefined

    const newId = addAINode('scene', pos, { title: suggestion.title, body: suggestion.body })
    if (selectedNodeId) {
      onConnect({ source: selectedNodeId, target: newId, sourceHandle: null, targetHandle: null })
    }
    dismissSuggestion(suggestion.id)
  }

  return (
    <div
      style={{
        border: '1.5px solid #e0e7ff',
        borderRadius: 9,
        padding: '12px 14px',
        background: '#fafbff',
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <Sparkles size={13} color="#7c3aed" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', flex: 1 }}>
          {suggestion.title}
        </div>
        <button
          onClick={() => dismissSuggestion(suggestion.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 2 }}
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, margin: '0 0 10px' }}>
        {suggestion.body}
      </p>

      {/* Reasoning toggle */}
      <button
        onClick={() => setShowReasoning(!showReasoning)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#7c3aed', fontSize: 11, fontWeight: 600, padding: 0, marginBottom: 8,
        }}
      >
        {showReasoning ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        Why did AI suggest this?
      </button>

      {showReasoning && (
        <div style={{
          background: '#f5f3ff', borderRadius: 6, padding: '8px 10px',
          fontSize: 11, color: '#5b21b6', lineHeight: 1.5, marginBottom: 8,
        }}>
          {suggestion.reasoning}
        </div>
      )}

      <button
        onClick={handleAddToGraph}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 6,
          border: 'none', background: '#6366f1',
          color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          width: '100%', justifyContent: 'center',
        }}
      >
        <Plus size={13} /> Add to story graph
      </button>
    </div>
  )
}
