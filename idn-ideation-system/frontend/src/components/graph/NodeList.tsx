import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useGraphStore } from '../../store/graphStore'

const TYPE_COLORS: Record<string, string> = {
  intro:    '#f97316',
  scene:    '#3b82f6',
  choice:   '#ca8a04',
  ending:   '#16a34a',
  question: '#9333ea',
  note:     '#6b7280',
}

const TYPE_LABELS: Record<string, string> = {
  intro: 'Intro',
  scene: 'Scene',
  choice: 'Choice',
  ending: 'Ending',
  question: 'Question',
  note: 'Note',
}

interface NodeListProps {
  onNodeSelect: (id: string) => void
}

export function NodeList({ onNodeSelect }: NodeListProps) {
  const nodes = useGraphStore((s) => s.nodes)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const requestFocusNode = useGraphStore((s) => s.requestFocusNode)
  const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId)

  const [search, setSearch] = useState('')

  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.data.nodeType === 'intro') return -1
    if (b.data.nodeType === 'intro') return 1
    const aNum = parseInt(a.id.replace('G', ''), 10)
    const bNum = parseInt(b.id.replace('G', ''), 10)
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
    return a.id.localeCompare(b.id)
  })

  const filtered = search.trim()
    ? sortedNodes.filter((n) => {
        const q = search.toLowerCase()
        return (
          n.data.title.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          (TYPE_LABELS[n.data.nodeType] ?? '').toLowerCase().includes(q)
        )
      })
    : sortedNodes

  function handleClick(nodeId: string) {
    setSelectedNodeId(nodeId)
    requestFocusNode(nodeId)
    onNodeSelect(nodeId)
  }

  return (
    <div
      style={{
        width: 200,
        background: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px 8px',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
          Nodes ({nodes.length})
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={12} color="#9ca3af" style={{ position: 'absolute', left: 8, flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: '100%',
              padding: '5px 28px 5px 26px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'inherit',
              color: '#374151',
              boxSizing: 'border-box',
              background: '#f9fafb',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', padding: 0, display: 'flex', alignItems: 'center',
              }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Node list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {nodes.length === 0 && (
          <div style={{ padding: 16, fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
            No nodes yet. Add nodes using the toolbar above.
          </div>
        )}
        {nodes.length > 0 && filtered.length === 0 && (
          <div style={{ padding: '14px 12px', fontSize: 12, color: '#9ca3af' }}>
            No nodes match "{search}"
          </div>
        )}
        {filtered.map((node) => {
          const color = TYPE_COLORS[node.data.nodeType] ?? '#9ca3af'
          const label = TYPE_LABELS[node.data.nodeType] ?? node.data.nodeType
          const isSelected = node.id === selectedNodeId
          const isPending = node.data.pending

          return (
            <div
              key={node.id}
              onClick={() => handleClick(node.id)}
              style={{
                padding: '9px 12px',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer',
                background: isSelected ? '#eff6ff' : isPending ? '#fffbeb' : 'transparent',
                borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f9fafb' }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isPending ? '#fffbeb' : 'transparent' }}
            >
              {/* Type badge + AI */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                <span
                  style={{
                    fontSize: 9, fontWeight: 700, color: '#fff',
                    background: isPending ? '#f59e0b' : color,
                    padding: '1px 5px', borderRadius: 3,
                    textTransform: 'uppercase', letterSpacing: 0.4,
                  }}
                >
                  {isPending ? 'Proposed' : label}
                </span>
                {node.data.aiGenerated && !node.data.pending && (
                  <span style={{ fontSize: 9, color: '#7c3aed', fontWeight: 700 }}>✦</span>
                )}
              </div>

              {/* Title */}
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#1a1a2e',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {node.data.title || 'Untitled'}
              </div>

              {/* ID */}
              <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace', marginTop: 1 }}>
                #{node.id}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
