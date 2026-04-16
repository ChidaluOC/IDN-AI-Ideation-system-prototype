import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Sparkles, Eye, Plus, Save, Search } from 'lucide-react'
import { useGraphStore } from '../../store/graphStore'
import { useAI } from '../../hooks/useAI'
import type { NodeType, StoryChoice } from '../../types/graph'

const AUTHOR_NODE_TYPES: NodeType[] = ['intro', 'scene', 'choice', 'ending']

interface NodeInspectorProps {
  nodeId: string
  onClose: () => void
  onOpenAIPanel: () => void
}

let choiceIdCounter = 1
function makeChoiceId() {
  return `c-${Date.now()}-${choiceIdCounter++}`
}

export function NodeInspector({ nodeId, onClose, onOpenAIPanel }: NodeInspectorProps) {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const removeNode = useGraphStore((s) => s.removeNode)
  const addConnectedChoiceNode = useGraphStore((s) => s.addConnectedChoiceNode)
  const createNode = useGraphStore((s) => s.createNode)
  const ensureEdge = useGraphStore((s) => s.ensureEdge)
  const removeEdgesWhere = useGraphStore((s) => s.removeEdgesWhere)
  const { requestBranches, requestPerspective } = useAI()

  const node = nodes.find((n) => n.id === nodeId)

  const [localTitle, setLocalTitle] = useState('')
  const [localBody, setLocalBody] = useState('')
  const [localDescription, setLocalDescription] = useState('')
  const [localPersonalNote, setLocalPersonalNote] = useState('')
  const [localNodeType, setLocalNodeType] = useState<NodeType>('scene')
  const [localTagsInput, setLocalTagsInput] = useState('')
  const [localNavMode, setLocalNavMode] = useState<'next' | 'choices'>('next')
  const [localChoices, setLocalChoices] = useState<StoryChoice[]>([])

  useEffect(() => {
    if (!node) return
    setLocalTitle(node.data.title)
    setLocalBody(node.data.body ?? '')
    setLocalDescription(node.data.description ?? '')
    setLocalPersonalNote(node.data.personalNote ?? '')
    setLocalNodeType(node.data.nodeType)
    setLocalTagsInput(node.data.tags.join(', '))
    const navMode = node.data.navigationMode ?? 'next'
    setLocalNavMode(navMode)

    if (node.data.nodeType === 'scene') {
      const choiceEdge = edges.find(
        (e) => e.source === nodeId && nodes.find((n) => n.id === e.target)?.data.nodeType === 'choice'
      )
      if (choiceEdge) {
        const choiceNode = nodes.find((n) => n.id === choiceEdge.target)
        setLocalChoices(choiceNode?.data.choices ?? [])
      } else {
        setLocalChoices([])
      }
    } else if (node.data.nodeType === 'choice') {
      setLocalChoices(node.data.choices ?? [])
    } else {
      setLocalChoices([])
    }
  }, [nodeId])

  if (!node) return null

  function parseTags(input: string) {
    return input.split(',').map((t) => t.trim()).filter(Boolean)
  }

  function addChoice() {
    const n = localChoices.length + 1
    setLocalChoices((prev) => [...prev, { id: makeChoiceId(), label: `Choice ${n}`, targetNodeId: null }])
  }

  function updateChoiceLabel(id: string, label: string) {
    setLocalChoices((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)))
  }

  function updateChoiceTarget(id: string, targetNodeId: string | null) {
    setLocalChoices((prev) => prev.map((c) => (c.id === id ? { ...c, targetNodeId } : c)))
  }

  function removeChoice(id: string) {
    setLocalChoices((prev) => prev.filter((c) => c.id !== id))
  }

  function handleCreateAndLink(choiceId: string, type: 'scene' | 'ending') {
    const newId = createNode(type)
    updateChoiceTarget(choiceId, newId)
  }

  function handleSave() {
    const tags = parseTags(localTagsInput)

    updateNodeData(nodeId, {
      title: localTitle,
      body: localBody,
      description: localDescription,
      personalNote: localPersonalNote,
      nodeType: localNodeType,
      tags,
      navigationMode: localNodeType === 'scene' ? localNavMode : undefined,
    })

    if (localNodeType === 'scene' && localNavMode === 'choices') {
      const choiceEdge = edges.find(
        (e) => e.source === nodeId && nodes.find((n) => n.id === e.target)?.data.nodeType === 'choice'
      )
      if (choiceEdge) {
        const existingChoiceNode = nodes.find((n) => n.id === choiceEdge.target)
        const existingChoices = existingChoiceNode?.data.choices ?? []
        const merged = localChoices.map((lc) => {
          const existing = existingChoices.find((ec) => ec.id === lc.id)
          return { ...lc, targetNodeId: existing?.targetNodeId ?? lc.targetNodeId ?? null }
        })
        updateNodeData(choiceEdge.target, { choices: merged })
      } else if (localChoices.length > 0) {
        addConnectedChoiceNode(nodeId, localChoices)
      }
    }

    if (localNodeType === 'choice') {
      const validTargetIds = new Set(
        localChoices.filter((c) => c.targetNodeId !== null).map((c) => c.targetNodeId as string)
      )
      for (const targetId of validTargetIds) {
        ensureEdge(nodeId, targetId)
      }
      removeEdgesWhere((e) => e.source === nodeId && !validTargetIds.has(e.target))
      updateNodeData(nodeId, { choices: localChoices })
    }

    onClose()
  }

  function handleDelete() {
    removeNode(nodeId)
    onClose()
  }

  async function handleBranches() {
    onOpenAIPanel()
    await requestBranches(nodeId)
  }

  async function handlePerspective() {
    onOpenAIPanel()
    await requestPerspective(nodeId)
  }

  const isScene = localNodeType === 'scene'
  const isChoice = localNodeType === 'choice'
  const isIntro = localNodeType === 'intro'
  const hasTextContent = !isChoice
  const showAIActions = !isChoice

  const otherNodes = nodes.filter((n) => n.id !== nodeId && !n.data.pending)

  return (
    <div
      style={{
        width: 320,
        background: '#fff',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13, color: '#374151' }}>Event Details</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleDelete} title="Delete event"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
            <Trash2 size={15} />
          </button>
          <button onClick={onClose} title="Close without saving"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Node ID — non-editable */}
        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Event ID</span>
          <span style={{ fontSize: 12, color: '#374151', fontFamily: 'monospace', fontWeight: 700 }}>
            #{nodeId}
            {node.data.aiGenerated && (
              <span style={{ marginLeft: 8, fontSize: 11, color: '#7c3aed', fontFamily: 'inherit' }}>✦ AI</span>
            )}
          </span>
        </div>

        {/* Event type */}
        <label style={labelStyle}>
          Event type
          <select
            value={localNodeType}
            onChange={(e) => setLocalNodeType(e.target.value as NodeType)}
            style={selectStyle}
          >
            {AUTHOR_NODE_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </label>

        {/* Title */}
        <label style={labelStyle}>
          Title
          <input value={localTitle} onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="Event title…" style={inputStyle} />
        </label>

        {/* Description */}
        <label style={labelStyle}>
          Description
          <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11 }}>
            Short author summary (not shown to audience)
          </span>
          <textarea value={localDescription} onChange={(e) => setLocalDescription(e.target.value)}
            placeholder="Brief description…" rows={2}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }} />
        </label>

        {/* Text / body — not for choice nodes */}
        {hasTextContent && (
          <label style={labelStyle}>
            Text
            <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11 }}>
              Content visible to the audience
            </span>
            <textarea value={localBody} onChange={(e) => setLocalBody(e.target.value)}
              placeholder={isIntro ? 'Introductory text…' : isScene ? 'Scene content…' : 'Content for this event…'}
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }} />
          </label>
        )}

        {/* Tags — not for choice nodes */}
        {!isChoice && (
          <label style={labelStyle}>
            Tags <span style={{ fontWeight: 400, color: '#9ca3af' }}>(comma-separated)</span>
            <input value={localTagsInput} onChange={(e) => setLocalTagsInput(e.target.value)}
              placeholder="e.g. tension, key-moment" style={inputStyle} />
          </label>
        )}

        {/* Navigation mode — scene only */}
        {isScene && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Navigation</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setLocalNavMode('next')} style={navButtonStyle(localNavMode === 'next', '#3b82f6')}>
                Next button
              </button>
              <button onClick={() => setLocalNavMode('choices')} style={navButtonStyle(localNavMode === 'choices', '#ca8a04')}>
                Choices
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
              {localNavMode === 'next'
                ? 'Audience sees a "Continue" button leading to the next scene.'
                : 'Audience sees named choice buttons that branch the path.'}
            </p>
          </div>
        )}

        {/* Choices — scene in choices mode */}
        {isScene && localNavMode === 'choices' && (
          <ChoicesEditor
            choices={localChoices}
            onAdd={addChoice}
            onUpdateLabel={updateChoiceLabel}
            onRemove={removeChoice}
            showTargets={false}
            otherNodes={otherNodes}
            onUpdateTarget={() => {}}
            onCreateAndLink={() => {}}
          />
        )}

        {/* Choices — choice node */}
        {isChoice && (
          <ChoicesEditor
            choices={localChoices}
            onAdd={addChoice}
            onUpdateLabel={updateChoiceLabel}
            onRemove={removeChoice}
            showTargets
            otherNodes={otherNodes}
            onUpdateTarget={updateChoiceTarget}
            onCreateAndLink={handleCreateAndLink}
          />
        )}

        {/* Personal note */}
        <label style={labelStyle}>
          Personal note
          <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 11 }}>Private notes for the author only</span>
          <textarea value={localPersonalNote} onChange={(e) => setLocalPersonalNote(e.target.value)}
            placeholder="Your private notes…" rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} />
        </label>

        {/* AI actions */}
        {showAIActions && (
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>AI assistance:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={handleBranches} style={aiButtonStyle('#7c3aed')}>
                <Sparkles size={13} /> Suggest branch ideas
              </button>
              <button onClick={handlePerspective} style={aiButtonStyle('#0891b2')}>
                <Eye size={13} /> Explore another perspective
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
        <button onClick={handleSave} style={saveButtonStyle}>
          <Save size={14} /> Save changes
        </button>
      </div>
    </div>
  )
}

// ── ChoicesEditor ─────────────────────────────────────────────────────────────

interface ChoicesEditorProps {
  choices: StoryChoice[]
  onAdd: () => void
  onUpdateLabel: (id: string, label: string) => void
  onRemove: (id: string) => void
  showTargets: boolean
  otherNodes: { id: string; data: { title: string; nodeType: string; aiGenerated: boolean } }[]
  onUpdateTarget: (id: string, targetId: string | null) => void
  onCreateAndLink: (choiceId: string, type: 'scene' | 'ending') => void
}

function ChoicesEditor({ choices, onAdd, onUpdateLabel, onRemove, showTargets, otherNodes, onUpdateTarget, onCreateAndLink }: ChoicesEditorProps) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Choices</span>
        <button onClick={onAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#ca8a04', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
          <Plus size={12} /> Add choice
        </button>
      </div>
      {choices.length === 0 && (
        <p style={{ fontSize: 11, color: '#9ca3af' }}>
          {showTargets
            ? 'No choices yet. Add choices and connect them to target events.'
            : 'No choices yet. Add choices that will appear as buttons to the audience. Targets can be set in the choice event after saving.'}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {choices.map((choice, idx) => (
          <div key={choice.id} style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 7, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#92400e', fontWeight: 700, minWidth: 20 }}>{idx + 1}.</span>
              <input
                value={choice.label}
                onChange={(e) => onUpdateLabel(choice.id, e.target.value)}
                placeholder={`Choice ${idx + 1} label…`}
                style={{ ...inputStyle, flex: 1, padding: '5px 8px', fontSize: 12 }}
              />
              <button onClick={() => onRemove(choice.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2, flexShrink: 0 }}>
                <X size={13} />
              </button>
            </div>
            {showTargets && (
              <TargetSelector
                choice={choice}
                otherNodes={otherNodes}
                onSelect={(targetId) => onUpdateTarget(choice.id, targetId)}
                onCreateAndLink={(type) => onCreateAndLink(choice.id, type)}
              />
            )}
          </div>
        ))}
      </div>
      {!showTargets && choices.length > 0 && (
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          After saving, a choice event will be created automatically. Open it to connect each choice to a target scene.
        </p>
      )}
    </div>
  )
}

// ── TargetSelector with search ────────────────────────────────────────────────

interface TargetSelectorProps {
  choice: StoryChoice
  otherNodes: { id: string; data: { title: string; nodeType: string; aiGenerated: boolean } }[]
  onSelect: (targetId: string | null) => void
  onCreateAndLink: (type: 'scene' | 'ending') => void
}

function TargetSelector({ choice, otherNodes, onSelect, onCreateAndLink }: TargetSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedNode = otherNodes.find((n) => n.id === choice.targetNodeId)

  const displayLabel = selectedNode
    ? `→ #${selectedNode.id}  ${selectedNode.data.title || 'Untitled'}`
    : '— Select target event —'

  const filtered = otherNodes.filter((n) => {
    const s = search.toLowerCase()
    if (!s) return true
    return (
      n.data.title.toLowerCase().includes(s) ||
      n.id.toLowerCase().includes(s)
    )
  })

  function handleOpen() {
    setOpen(true)
    setSearch('')
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  function handleSelect(value: string) {
    setOpen(false)
    setSearch('')
    if (value === '__create_scene') {
      onCreateAndLink('scene')
    } else if (value === '__create_ending') {
      onCreateAndLink('ending')
    } else if (value === '__none') {
      onSelect(null)
    } else {
      onSelect(value)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff',
          fontSize: 11, color: selectedNode ? '#1a1a2e' : '#9ca3af', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {displayLabel}
          {selectedNode?.data.aiGenerated && <span style={{ marginLeft: 6, color: '#7c3aed' }}>✦</span>}
        </span>
        <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: '#fff', border: '1px solid #d1d5db', borderRadius: 7,
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)', marginTop: 2,
          }}
        >
          {/* Search input */}
          <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={12} color="#9ca3af" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID…"
              style={{ border: 'none', outline: 'none', fontSize: 11, flex: 1, fontFamily: 'inherit' }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 180, overflow: 'auto' }}>
            <DropdownOption label="— No connection —" value="__none" onSelect={handleSelect} dimmed />
            {filtered.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 11, color: '#9ca3af' }}>No matching events</div>
            )}
            {filtered.map((n) => (
              <DropdownOption
                key={n.id}
                label={`${n.data.title || 'Untitled'} (${n.data.nodeType})`}
                subLabel={`#${n.id}${n.data.aiGenerated ? ' ✦ AI' : ''}`}
                value={n.id}
                onSelect={handleSelect}
                active={n.id === choice.targetNodeId}
              />
            ))}
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', padding: '4px 0' }}>
            <DropdownOption label="+ Create new Scene event" value="__create_scene" onSelect={handleSelect} accent="#3b82f6" />
            <DropdownOption label="+ Create new Ending event" value="__create_ending" onSelect={handleSelect} accent="#16a34a" />
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownOption({
  label, subLabel, value, onSelect, dimmed, accent, active,
}: {
  label: string; subLabel?: string; value: string; onSelect: (v: string) => void
  dimmed?: boolean; accent?: string; active?: boolean
}) {
  return (
    <button
      onClick={() => onSelect(value)}
      style={{
        display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left',
        padding: '6px 10px', background: active ? '#eff6ff' : 'none', border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'none' }}
    >
      <span style={{ fontSize: 11, color: accent ?? (dimmed ? '#9ca3af' : '#374151'), fontWeight: accent ? 600 : 400 }}>
        {label}
      </span>
      {subLabel && (
        <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{subLabel}</span>
      )}
    </button>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
  fontSize: 12, fontWeight: 600, color: '#374151',
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db',
  fontSize: 13, color: '#1a1a2e', outline: 'none', fontFamily: 'inherit',
  width: '100%', boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = { ...inputStyle, background: '#fff', cursor: 'pointer' }

const navButtonStyle = (active: boolean, color: string): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 6,
  border: `1.5px solid ${active ? color : '#d1d5db'}`,
  background: active ? color : '#fff',
  color: active ? '#fff' : '#6b7280',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
})

const aiButtonStyle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 7,
  border: `1.5px solid ${color}`, background: '#fff', color,
  fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
})

const saveButtonStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 6, padding: '9px 0', borderRadius: 8, border: 'none',
  background: '#1a1a2e', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
}
