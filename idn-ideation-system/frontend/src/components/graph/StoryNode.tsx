import { memo } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeType } from '../../types/graph'

const TYPE_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  intro:    { bg: '#fff7ed', border: '#f97316', badge: '#f97316' },
  scene:    { bg: '#eff6ff', border: '#3b82f6', badge: '#3b82f6' },
  choice:   { bg: '#fef9c3', border: '#ca8a04', badge: '#ca8a04' },
  ending:   { bg: '#f0fdf4', border: '#16a34a', badge: '#16a34a' },
  question: { bg: '#fdf4ff', border: '#9333ea', badge: '#9333ea' },
  // 'note' kept for backward-compat with old saves
  note:     { bg: '#f9fafb', border: '#6b7280', badge: '#6b7280' },
}

const TYPE_LABELS: Record<string, string> = {
  intro: 'Intro',
  scene: 'Scene',
  choice: 'Choice',
  ending: 'Ending',
  question: 'Question',
  note: 'Note',
}

interface StoryNodeProps {
  id: string
  data: {
    title: string
    body: string
    nodeType: NodeType | string
    tags: string[]
    aiGenerated: boolean
    pending?: boolean
    navigationMode?: 'next' | 'choices'
    choices?: { id: string; label: string; targetNodeId: string | null }[]
  }
  selected?: boolean
}

export const StoryNode = memo(({ id, data, selected }: StoryNodeProps) => {
  const colors = TYPE_COLORS[data.nodeType] ?? TYPE_COLORS.scene
  const pendingBorder = '#f59e0b'
  const pendingGlow = '0 0 0 3px rgba(245,158,11,0.35), 0 2px 8px rgba(245,158,11,0.2)'

  const choiceCount = data.choices?.length ?? 0
  const isIntro = data.nodeType === 'intro'

  return (
    <div
      style={{
        background: data.pending ? '#fffbeb' : colors.bg,
        border: `2px solid ${data.pending ? pendingBorder : selected ? '#6366f1' : colors.border}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 160,
        maxWidth: 260,
        boxShadow: data.pending ? pendingGlow : selected ? '0 0 0 3px rgba(99,102,241,0.25)' : '0 1px 4px rgba(0,0,0,0.08)',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <NodeResizer minWidth={140} minHeight={60} isVisible={selected} />

      {/* No target handle for intro node (nothing connects TO it) */}
      {!isIntro && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: colors.border, width: 10, height: 10 }}
        />
      )}

      {/* Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
        <span
          style={{
            background: data.pending ? '#f59e0b' : colors.badge,
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          }}
        >
          {TYPE_LABELS[data.nodeType] ?? data.nodeType}
        </span>

        {/* AI badge — always shown when AI-generated */}
        {data.aiGenerated && !data.pending && (
          <span
            style={{
              fontSize: 10, fontWeight: 700, color: '#7c3aed',
              background: '#f5f3ff', padding: '1px 5px', borderRadius: 3,
            }}
            title="AI generated"
          >
            ✦ AI
          </span>
        )}

        {data.pending && (
          <span style={{ fontSize: 10, color: '#b45309', fontWeight: 700 }} title="Proposed by AI — pending confirmation">⬡ Proposed</span>
        )}

        {data.nodeType === 'scene' && data.navigationMode === 'choices' && (
          <span style={{ fontSize: 10, color: '#92400e', fontWeight: 600, background: '#fde68a', padding: '1px 5px', borderRadius: 3 }}>
            Choices
          </span>
        )}
      </div>

      {/* Node ID */}
      <div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: 0.3, marginBottom: 4, fontFamily: 'monospace' }}>
        #{id}
      </div>

      {/* Title */}
      <div
        style={{
          fontWeight: 600,
          fontSize: 13,
          color: '#1a1a2e',
          lineHeight: 1.3,
          marginBottom: data.body ? 6 : 0,
          wordBreak: 'break-word',
        }}
      >
        {data.title || 'Untitled'}
      </div>

      {/* Body preview — not for choice nodes */}
      {data.body && data.nodeType !== 'choice' && (
        <div
          style={{
            fontSize: 11,
            color: '#6b7280',
            lineHeight: 1.4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {data.body}
        </div>
      )}

      {/* Choice count for choice nodes */}
      {data.nodeType === 'choice' && choiceCount > 0 && (
        <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>
          {choiceCount} choice{choiceCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Tags */}
      {data.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {data.tags.map((tag) => (
            <span
              key={tag}
              style={{
                background: '#e5e7eb',
                color: '#4b5563',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 3,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* No source handle for ending node (can't connect out from endings) */}
      {data.nodeType !== 'ending' && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ background: colors.border, width: 10, height: 10 }}
        />
      )}
    </div>
  )
})

StoryNode.displayName = 'StoryNode'
