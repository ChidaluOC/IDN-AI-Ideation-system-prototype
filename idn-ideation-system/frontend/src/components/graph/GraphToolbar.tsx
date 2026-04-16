import { Plus, Film, GitBranch, Flag, Play, BarChart2, Sunrise } from 'lucide-react'
import { useGraphStore } from '../../store/graphStore'
import type { NodeType } from '../../types/graph'

const NODE_BUTTONS: { type: NodeType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'intro',  label: 'Intro',  icon: <Sunrise size={14} />,   color: '#f97316' },
  { type: 'scene',  label: 'Scene',  icon: <Film size={14} />,      color: '#3b82f6' },
  { type: 'choice', label: 'Choice', icon: <GitBranch size={14} />, color: '#ca8a04' },
  { type: 'ending', label: 'Ending', icon: <Flag size={14} />,      color: '#16a34a' },
]

interface GraphToolbarProps {
  onOpenPreview: () => void
  onOpenTracking: () => void
}

export function GraphToolbar({ onOpenPreview, onOpenTracking }: GraphToolbarProps) {
  const addNode = useGraphStore((s) => s.addNode)
  const nodes = useGraphStore((s) => s.nodes)

  function handleAddNode(type: NodeType) {
    // Enforce single intro rule
    if (type === 'intro') {
      const existing = nodes.find((n) => n.data.nodeType === 'intro')
      if (existing) {
        alert('Only one Intro event is allowed. Your story can only have one beginning.')
        return
      }
    }
    addNode(type)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Plus size={12} /> Add event:
      </span>

      {NODE_BUTTONS.map(({ type, label, icon, color }) => (
        <button
          key={type}
          onClick={() => handleAddNode(type)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            borderRadius: 6,
            border: `1.5px solid ${color}`,
            background: '#fff',
            color,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = color + '15')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          title={`Add a ${label} event${type === 'intro' ? ' (only one allowed)' : ''}`}
        >
          {icon} {label}
        </button>
      ))}

      <div style={{ width: 1, height: 20, background: '#e5e7eb', marginLeft: 4, marginRight: 4 }} />

      {/* Tracking button */}
      <button
        onClick={onOpenTracking}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 6,
          border: '1.5px solid #6366f1', background: '#fff',
          color: '#6366f1', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#6366f115')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
        title="Story tracker"
      >
        <BarChart2 size={13} /> Tracker
      </button>

      {/* Preview button */}
      <button
        onClick={onOpenPreview}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 14px', borderRadius: 6,
          border: '1.5px solid #1a1a2e', background: '#1a1a2e',
          color: '#fff', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        title="Preview story as audience"
      >
        <Play size={13} /> Preview
      </button>

      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#d1d5db' }}>
        Click events to select · Drag handles to connect
      </span>
    </div>
  )
}
