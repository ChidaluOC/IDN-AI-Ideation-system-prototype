import { useState, useMemo } from 'react'
import { X, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useGraphStore } from '../../store/graphStore'
import { useAI } from '../../hooks/useAI'
import { useAIStore } from '../../store/aiStore'
import type { StoryNode, StoryEdge } from '../../types/graph'

interface TrackingPanelProps {
  onClose: () => void
  onFocusNode: (id: string) => void
}

// ── Path computation ──────────────────────────────────────────────────────────

const MAX_PATHS = 50

function getNextNodes(nodeId: string, nodes: StoryNode[], edges: StoryEdge[]): string[] {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node || node.data.nodeType === 'ending') return []

  const outEdges = edges.filter((e) => e.source === nodeId)

  if (node.data.nodeType === 'scene' && node.data.navigationMode === 'choices') {
    const choiceEdge = outEdges.find(
      (e) => nodes.find((n) => n.id === e.target)?.data.nodeType === 'choice'
    )
    if (choiceEdge) {
      const choiceNode = nodes.find((n) => n.id === choiceEdge.target)
      return (choiceNode?.data.choices ?? [])
        .filter((c) => c.targetNodeId !== null)
        .map((c) => c.targetNodeId as string)
    }
    return []
  }

  // next mode or other types — follow non-choice edges
  return outEdges
    .filter((e) => {
      const t = nodes.find((n) => n.id === e.target)
      return t && t.data.nodeType !== 'choice'
    })
    .map((e) => e.target)
}

function countPathsToEnding(
  startId: string,
  endingId: string,
  nodes: StoryNode[],
  edges: StoryEdge[]
): { count: number; maxReached: boolean } {
  let count = 0
  let maxReached = false

  function dfs(nodeId: string, visited: Set<string>) {
    if (maxReached) return
    if (nodeId === endingId) { count++; if (count >= MAX_PATHS) maxReached = true; return }
    for (const nextId of getNextNodes(nodeId, nodes, edges)) {
      if (!visited.has(nextId)) {
        const v2 = new Set(visited)
        v2.add(nextId)
        dfs(nextId, v2)
      }
    }
  }

  dfs(startId, new Set([startId]))
  return { count, maxReached }
}

// ── Problem detection ─────────────────────────────────────────────────────────

function analyzeGraph(nodes: StoryNode[], edges: StoryEdge[]) {
  const incomingIds = new Set(edges.map((e) => e.target))
  const outgoingFromNode = (id: string) => edges.filter((e) => e.source === id)

  // Nodes without any outgoing connections (except endings)
  const noOutgoing = nodes.filter((n) => {
    if (n.data.nodeType === 'ending') return false // endings are supposed to be dead-ends
    if (n.data.nodeType === 'choice') return false // choice nodes connect through choices array
    return outgoingFromNode(n.id).length === 0
  })

  // Choice nodes with choices missing targets
  const choicesWithMissingTargets = nodes.filter((n) => {
    if (n.data.nodeType !== 'choice') return false
    return (n.data.choices ?? []).some((c) => !c.targetNodeId)
  })

  // Scenes in 'choices' mode with no connected choice node
  const scenesWithMissingChoiceNode = nodes.filter((n) => {
    if (n.data.nodeType !== 'scene') return false
    if (n.data.navigationMode !== 'choices') return false
    const hasChoiceNode = edges.some(
      (e) => e.source === n.id && nodes.find((t) => t.id === e.target)?.data.nodeType === 'choice'
    )
    return !hasChoiceNode
  })

  // Nodes with no preceding nodes (other than intro)
  const noIncoming = nodes.filter(
    (n) => n.data.nodeType !== 'intro' && !incomingIds.has(n.id)
  )

  return { noOutgoing, choicesWithMissingTargets, scenesWithMissingChoiceNode, noIncoming }
}

// ── Sub-component: collapsible problem row ────────────────────────────────────

function ProblemRow({
  count, label, hint, nodes: problemNodes, onFocusNode, severity,
}: {
  count: number
  label: string
  hint: string
  nodes: StoryNode[]
  onFocusNode: (id: string) => void
  severity: 'error' | 'warn' | 'ok'
}) {
  const [open, setOpen] = useState(false)

  const colorMap = { error: '#ef4444', warn: '#f59e0b', ok: '#16a34a' }
  const bgMap = { error: '#fef2f2', warn: '#fffbeb', ok: '#f0fdf4' }
  const color = colorMap[severity]
  const bg = bgMap[severity]

  return (
    <div style={{ borderRadius: 8, border: `1px solid ${color}30`, background: bg, overflow: 'hidden' }}>
      <button
        onClick={() => count > 0 && setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', background: 'none', border: 'none',
          cursor: count > 0 ? 'pointer' : 'default', textAlign: 'left',
        }}
      >
        {severity === 'ok'
          ? <CheckCircle size={14} color={color} style={{ flexShrink: 0 }} />
          : <AlertTriangle size={14} color={color} style={{ flexShrink: 0 }} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e' }}>{label}</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{hint}</div>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, color,
          background: `${color}20`, padding: '2px 8px', borderRadius: 10, minWidth: 24, textAlign: 'center',
        }}>
          {count}
        </span>
        {count > 0 && (
          open ? <ChevronDown size={13} color="#9ca3af" /> : <ChevronRight size={13} color="#9ca3af" />
        )}
      </button>

      {open && count > 0 && (
        <div style={{ borderTop: `1px solid ${color}20`, padding: '6px 0' }}>
          {problemNodes.map((n) => (
            <button
              key={n.id}
              onClick={() => onFocusNode(n.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${color}10`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#9ca3af' }}>#{n.id}</span>
              <span style={{ fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.data.title || 'Untitled'}
              </span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>→ focus</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function TrackingPanel({ onClose, onFocusNode }: TrackingPanelProps) {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const { checkCoherence } = useAI()
  const isLoading = useAIStore((s) => s.isLoading)
  const coherenceIssues = useAIStore((s) => s.coherenceIssues)
  const coherenceAssessment = useAIStore((s) => s.coherenceAssessment)

  const introNode = nodes.find((n) => n.data.nodeType === 'intro')
  const endingNodes = nodes.filter((n) => n.data.nodeType === 'ending')
  const sceneNodes = nodes.filter((n) => n.data.nodeType === 'scene')
  const choiceNodes = nodes.filter((n) => n.data.nodeType === 'choice')

  const problems = useMemo(() => analyzeGraph(nodes, edges), [nodes, edges])

  // Path stats
  const pathStats = useMemo(() => {
    const startId = introNode?.id ?? null
    if (!startId || endingNodes.length === 0) return null

    let totalPaths = 0
    let globalMax = false
    const perEnding = endingNodes.map((ending) => {
      const { count, maxReached } = countPathsToEnding(startId, ending.id, nodes, edges)
      totalPaths += count
      if (maxReached) globalMax = true
      return { ending, count, maxReached }
    })
    return { totalPaths, globalMax, perEnding }
  }, [nodes, edges, introNode, endingNodes])

  function handleFocusNode(id: string) {
    onFocusNode(id)
    // Don't close panel so author can work through the list
  }

  const statBox = (value: string | number, label: string, color: string = '#374151') => (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  )

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: 440, height: '100%',
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Story Tracker</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Overview of your protostory structure</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {statBox(nodes.length, 'Total nodes')}
            {statBox(sceneNodes.length, 'Scenes', '#3b82f6')}
            {statBox(endingNodes.length, 'Endings', '#16a34a')}
            {statBox(choiceNodes.length, 'Choice nodes', '#ca8a04')}
            {statBox(introNode ? '✓' : '✗', 'Intro node', introNode ? '#16a34a' : '#ef4444')}
            {statBox(
              pathStats
                ? (pathStats.globalMax ? `${MAX_PATHS}+` : pathStats.totalPaths)
                : '—',
              'Total paths', '#6366f1'
            )}
          </div>

          {/* Paths to each ending */}
          {pathStats && pathStats.perEnding.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Paths from intro to each ending
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pathStats.perEnding.map(({ ending, count, maxReached }) => (
                  <div
                    key={ending.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', background: '#f0fdf4',
                      border: '1px solid #bbf7d0', borderRadius: 7,
                    }}
                  >
                    <button
                      onClick={() => handleFocusNode(ending.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left', padding: 0 }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>
                        {ending.data.title || 'Untitled ending'}{' '}
                        <span style={{ fontFamily: 'monospace', color: '#9ca3af', fontWeight: 400 }}>#{ending.id}</span>
                      </div>
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                      {maxReached ? `${MAX_PATHS}+` : count} path{count !== 1 && !maxReached ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!introNode && (
            <div style={{ marginBottom: 20, padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>No Intro node found</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                Add an Intro node to define the beginning of your protostory. Path counting requires a defined start point.
              </div>
            </div>
          )}

          {/* Problems section */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
            Structural issues
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <ProblemRow
              count={problems.noIncoming.length}
              label="Nodes without a preceding node"
              hint={`Only the Intro node should have no incoming connection. ${problems.noIncoming.length > 0 ? 'These nodes are unreachable.' : 'All good!'}`}
              nodes={problems.noIncoming}
              onFocusNode={handleFocusNode}
              severity={problems.noIncoming.length === 0 ? 'ok' : 'error'}
            />
            <ProblemRow
              count={problems.noOutgoing.length}
              label="Nodes without a target connection"
              hint="Non-ending nodes should connect forward to continue the story."
              nodes={problems.noOutgoing}
              onFocusNode={handleFocusNode}
              severity={problems.noOutgoing.length === 0 ? 'ok' : 'warn'}
            />
            <ProblemRow
              count={problems.choicesWithMissingTargets.length}
              label="Choice nodes with unconnected choices"
              hint="Some choices don't have a target node — they won't work in preview."
              nodes={problems.choicesWithMissingTargets}
              onFocusNode={handleFocusNode}
              severity={problems.choicesWithMissingTargets.length === 0 ? 'ok' : 'warn'}
            />
            <ProblemRow
              count={problems.scenesWithMissingChoiceNode.length}
              label="Scenes in 'choices' mode with no choice node"
              hint="These scenes are set to 'choices' navigation but have no connected choice node."
              nodes={problems.scenesWithMissingChoiceNode}
              onFocusNode={handleFocusNode}
              severity={problems.scenesWithMissingChoiceNode.length === 0 ? 'ok' : 'warn'}
            />
          </div>

          {/* Coherence check */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
              AI Coherence Check
            </div>
            <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
              Use AI to scan for logical inconsistencies and narrative faults in the story so far.
            </p>
            <button
              onClick={checkCoherence}
              disabled={isLoading || nodes.length === 0}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
                background: isLoading || nodes.length === 0 ? '#e5e7eb' : '#0891b2',
                color: isLoading || nodes.length === 0 ? '#9ca3af' : '#fff',
                fontSize: 13, fontWeight: 700,
                cursor: isLoading || nodes.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Checking…' : 'Check coherence'}
            </button>

            {coherenceIssues !== null && (
              <div style={{ marginTop: 14, background: '#f0f9ff', borderRadius: 8, padding: 14 }}>
                <p style={{ fontSize: 12, color: '#374151', marginBottom: coherenceIssues.length ? 10 : 0, fontWeight: 600 }}>
                  {coherenceAssessment}
                </p>
                {coherenceIssues.map((issue, i) => (
                  <div key={i} style={{ borderTop: '1px solid #e0f2fe', paddingTop: 8, marginTop: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', marginBottom: 4, textTransform: 'capitalize' }}>
                      {issue.issue_type.replace('_', ' ')}
                    </p>
                    <p style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{issue.description}</p>
                    <p style={{ fontSize: 11, color: '#0891b2' }}>→ {issue.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
