import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, ChevronLeft, ChevronRight, Wand2, BookOpen, BarChart2, Lightbulb } from 'lucide-react'
import { useAIStore } from '../../store/aiStore'
import { useAI } from '../../hooks/useAI'
import { useProjectStore } from '../../store/projectStore'
import { AIStatusBadge } from './AIStatusBadge'
import { ChatThread } from './ChatThread'
import { SuggestionCard } from './SuggestionCard'
import { useGraphStore } from '../../store/graphStore'

type Tab = 'coauthor' | 'guide' | 'suggestions' | 'critique'

interface AIPanelProps {
  collapsed: boolean
  onToggle: () => void
}

// ── Co-author state-machine cards ─────────────────────────────────────────────

function ScopeCard({ onReplace, onAdd, disabled }: { onReplace: () => void; onAdd: () => void; disabled: boolean }) {
  return (
    <div style={{ padding: '10px 12px', background: '#fef9c3', borderTop: '1px solid #fde68a', flexShrink: 0 }}>
      <p style={{ fontSize: 12, color: '#92400e', marginBottom: 8, fontWeight: 600 }}>
        Am I allowed to completely replace the current protostory, or should I only add new elements?
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onReplace}
          disabled={disabled}
          style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: '#b45309', color: '#fff', fontSize: 11, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
        >
          Replace everything
        </button>
        <button
          onClick={onAdd}
          disabled={disabled}
          style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: '#0891b2', color: '#fff', fontSize: 11, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
        >
          Add to existing
        </button>
      </div>
    </div>
  )
}

function ConfirmCard({ onConfirm, onReject, pendingCount }: { onConfirm: () => void; onReject: () => void; pendingCount: number }) {
  return (
    <div style={{ padding: '10px 12px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', flexShrink: 0 }}>
      <p style={{ fontSize: 12, color: '#166534', marginBottom: 4, fontWeight: 600 }}>
        {pendingCount} proposed node{pendingCount !== 1 ? 's' : ''} on canvas
      </p>
      <p style={{ fontSize: 11, color: '#166534', marginBottom: 8 }}>
        Highlighted in orange. Click any node to inspect. Confirm to keep or reject to restore the previous canvas.
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onConfirm}
          style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          ✓ Confirm
        </button>
        <button
          onClick={onReject}
          style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function AIPanel({ collapsed, onToggle }: AIPanelProps) {
  const [tab, setTab] = useState<Tab>('coauthor')
  const [guideInput, setGuideInput] = useState('')
  const [coAuthorInput, setCoAuthorInput] = useState('')
  const [lastSuggestedNodeId, setLastSuggestedNodeId] = useState<string | null>(null)

  const {
    sendChatMessage,
    sendCoAuthorMessage,
    generateFromCoAuthor,
    confirmGeneration,
    rejectGeneration,
    requestBranches,
    generateNarrativeOverview,
  } = useAI()

  const coAuthorMode = useAIStore((s) => s.coAuthorMode)
  const setCoAuthorMode = useAIStore((s) => s.setCoAuthorMode)
  const coAuthorHistory = useAIStore((s) => s.coAuthorHistory)
  const coAuthorIsStreaming = useAIStore((s) => s.coAuthorIsStreaming)
  const coAuthorStreamingContent = useAIStore((s) => s.coAuthorStreamingContent)
  const coAuthorIsSearching = useAIStore((s) => s.coAuthorIsSearching)
  const coAuthorSearchQuery = useAIStore((s) => s.coAuthorSearchQuery)
  const coAuthorStreamingSources = useAIStore((s) => s.coAuthorStreamingSources)
  const generationState = useAIStore((s) => s.generationState)
  const pendingScopeRequest = useAIStore((s) => s.pendingScopeRequest)
  const setPendingScopeRequest = useAIStore((s) => s.setPendingScopeRequest)
  const setGenerationState = useAIStore((s) => s.setGenerationState)
  const addCoAuthorUserMessage = useAIStore((s) => s.addCoAuthorUserMessage)
  const addCoAuthorAIMessage = useAIStore((s) => s.addCoAuthorAIMessage)

  const isLoading = useAIStore((s) => s.isLoading)
  const isStreaming = useAIStore((s) => s.isStreaming)
  const suggestions = useAIStore((s) => s.suggestions)
  const narrativeOverview = useAIStore((s) => s.narrativeOverview)

  const projectId = useProjectStore((s) => s.projectId)
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId)
  const nodes = useGraphStore((s) => s.nodes)

  const guideInputRef = useRef<HTMLTextAreaElement>(null)
  const coAuthorInputRef = useRef<HTMLTextAreaElement>(null)

  const pendingCount = nodes.filter((n) => n.data.pending).length
  const activeSuggestions = suggestions.filter((s) => !s.dismissed)

  // Auto-request branch suggestions when Suggestions tab is active + node selected
  useEffect(() => {
    if (tab === 'suggestions' && selectedNodeId && selectedNodeId !== lastSuggestedNodeId && !isLoading) {
      setLastSuggestedNodeId(selectedNodeId)
      requestBranches(selectedNodeId)
    }
  }, [tab, selectedNodeId, isLoading])

  // Reset last-suggested when node changes (so fresh suggestions are fetched)
  useEffect(() => {
    if (selectedNodeId !== lastSuggestedNodeId) {
      setLastSuggestedNodeId(null)
    }
  }, [selectedNodeId])

  // Quick-prompt event from IDN Guide empty state
  useEffect(() => {
    const handler = (e: Event) => {
      setGuideInput((e as CustomEvent).detail as string)
      guideInputRef.current?.focus()
    }
    window.addEventListener('idn:chat-prompt', handler)
    return () => window.removeEventListener('idn:chat-prompt', handler)
  }, [])

  // ── Guide handlers ──────────────────────────────────────────────────────────

  const handleGuideSend = async () => {
    const msg = guideInput.trim()
    if (!msg || isStreaming) return
    setGuideInput('')
    await sendChatMessage(msg)
  }

  const handleGuideKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGuideSend() }
  }

  // ── Co-author handlers ──────────────────────────────────────────────────────

  const handleCoAuthorSend = async () => {
    const msg = coAuthorInput.trim()
    if (!msg || coAuthorIsStreaming) return
    setCoAuthorInput('')

    if (coAuthorMode === 'ideate') {
      await sendCoAuthorMessage(msg)
      return
    }

    // Generate mode
    if (generationState === 'pending_confirmation') return // block while confirming

    // If there are existing (confirmed) nodes, ask about scope first
    const existingNodes = nodes.filter((n) => !n.data.pending)
    if (existingNodes.length > 0 && generationState === 'idle') {
      addCoAuthorUserMessage(msg)
      setPendingScopeRequest(msg)
      setGenerationState('awaiting_scope')
      addCoAuthorAIMessage(
        "Before I generate — should I completely replace the current protostory on the canvas, or should I add new elements to what you've already built?"
      )
      return
    }

    // No existing nodes, go straight to generation
    addCoAuthorUserMessage(msg)
    await generateFromCoAuthor(msg, true)
  }

  const handleCoAuthorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCoAuthorSend() }
  }

  const handleScopeReplace = async () => {
    if (!pendingScopeRequest) return
    addCoAuthorUserMessage('Replace everything')
    await generateFromCoAuthor(pendingScopeRequest, true)
  }

  const handleScopeAdd = async () => {
    if (!pendingScopeRequest) return
    addCoAuthorUserMessage('Add to existing')
    await generateFromCoAuthor(pendingScopeRequest, false)
  }

  // ── Collapsed state ─────────────────────────────────────────────────────────

  if (collapsed) {
    return (
      <div
        style={{ width: 36, background: '#fff', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 12, cursor: 'pointer' }}
        onClick={onToggle}
        title="Open AI panel"
      >
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1' }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 10, color: '#9ca3af', writingMode: 'vertical-rl', letterSpacing: 1 }}>AI ASSISTANT</span>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: 320, background: '#fff', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={15} color="#7c3aed" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e' }}>AI Assistant</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AIStatusBadge />
            <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {projectId && (
          <div style={{ display: 'flex', gap: 3 }}>
            {([
              ['coauthor', 'Co-author'],
              ['guide', 'IDN Guide'],
              ['suggestions', `Suggestions${activeSuggestions.length ? ` (${activeSuggestions.length})` : ''}`],
              ['critique', 'Critique'],
            ] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '5px 2px', borderRadius: 6, border: 'none',
                  fontSize: 9.5, fontWeight: 600, cursor: 'pointer',
                  background: tab === t ? '#6366f1' : '#f3f4f6',
                  color: tab === t ? '#fff' : '#6b7280',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!projectId ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.7 }}>
            Open or create a project to start using the AI assistant.
          </p>
        </div>
      ) : (
        <>
          {/* ── Co-author tab ──────────────────────────────────────────────── */}
          {tab === 'coauthor' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Thread */}
              <ChatThread
                history={coAuthorHistory}
                isStreaming={coAuthorIsStreaming}
                streamingContent={coAuthorStreamingContent}
                isSearching={coAuthorIsSearching}
                currentSearchQuery={coAuthorSearchQuery}
                streamingSources={coAuthorStreamingSources}
                emptyState={
                  <div style={{ textAlign: 'center', paddingTop: 20 }}>
                    <Wand2 size={22} color="#e5e7eb" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
                      {coAuthorMode === 'ideate'
                        ? 'Share your idea or theme. Ask questions, explore angles, or brainstorm perspectives.'
                        : 'Describe what you want to build and I\'ll generate a narrative structure for the canvas.'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {coAuthorMode === 'ideate' ? [
                        'I want to explore the theme of migration and belonging',
                        'What perspectives should I include in a story about climate policy?',
                        'Help me develop the idea of a character who holds contradictory views',
                        'What makes a good IDN choice point?',
                      ] : [
                        'Generate a narrative about housing inequality in a major city',
                        'Based on what we discussed, create a story graph',
                        'Build a multi-perspective story exploring digital privacy',
                        'Create a branching narrative with 3 distinct character perspectives',
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => { setCoAuthorInput(q); coAuthorInputRef.current?.focus() }}
                          style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e0e7ff', background: '#fafbff', color: '#6366f1', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                }
              />

              {/* State machine cards */}
              {generationState === 'awaiting_scope' && (
                <ScopeCard
                  onReplace={handleScopeReplace}
                  onAdd={handleScopeAdd}
                  disabled={generationState !== 'awaiting_scope'}
                />
              )}
              {generationState === 'pending_confirmation' && (
                <ConfirmCard
                  onConfirm={confirmGeneration}
                  onReject={rejectGeneration}
                  pendingCount={pendingCount}
                />
              )}

              {/* Input */}
              <div style={{ padding: '8px 12px', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
                  <textarea
                    ref={coAuthorInputRef}
                    value={coAuthorInput}
                    onChange={(e) => setCoAuthorInput(e.target.value)}
                    onKeyDown={handleCoAuthorKeyDown}
                    placeholder={coAuthorMode === 'ideate' ? 'Share an idea or ask a question…' : 'Describe what to generate…'}
                    rows={2}
                    disabled={generationState === 'pending_confirmation' || generationState === 'generating' || coAuthorIsStreaming}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                  <button
                    onClick={handleCoAuthorSend}
                    disabled={!coAuthorInput.trim() || coAuthorIsStreaming || generationState === 'pending_confirmation' || generationState === 'generating'}
                    style={{
                      padding: '9px 11px', borderRadius: 8, border: 'none',
                      background: coAuthorMode === 'generate' ? '#7c3aed' : '#6366f1',
                      color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 700,
                      opacity: (!coAuthorInput.trim() || coAuthorIsStreaming || generationState === 'pending_confirmation' || generationState === 'generating') ? 0.45 : 1,
                    }}
                  >
                    {coAuthorMode === 'generate' ? <><Wand2 size={13} /> Generate</> : <><Send size={13} /> Send</>}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#d1d5db', marginTop: 3 }}>Enter to send · Shift+Enter for new line</p>
              </div>

              {/* Mode switcher */}
              <div style={{ padding: '8px 12px', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                  <button
                    onClick={() => setCoAuthorMode('ideate')}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 7, border: 'none',
                      background: coAuthorMode === 'ideate' ? '#10b981' : '#f3f4f6',
                      color: coAuthorMode === 'ideate' ? '#fff' : '#6b7280',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    Ideate mode
                  </button>
                  <button
                    onClick={() => setCoAuthorMode('generate')}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 7, border: 'none',
                      background: coAuthorMode === 'generate' ? '#7c3aed' : '#f3f4f6',
                      color: coAuthorMode === 'generate' ? '#fff' : '#6b7280',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    Generate mode
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 1.4 }}>
                  {coAuthorMode === 'ideate'
                    ? <>You are in <strong style={{ color: '#059669' }}>Ideate mode</strong> — explore ideas and ask questions</>
                    : <>You are in <strong style={{ color: '#7c3aed' }}>Generate mode</strong> — describe what to build</>}
                </p>
              </div>
            </div>
          )}

          {/* ── IDN Guide tab ──────────────────────────────────────────────── */}
          {tab === 'guide' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <ChatThread
                emptyState={
                  <div style={{ textAlign: 'center', paddingTop: 20 }}>
                    <BookOpen size={22} color="#e5e7eb" style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.7, marginBottom: 12 }}>
                      Ask me anything about IDN concepts, how to use this tool, or how to structure your narrative.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {[
                        'What is an IDN?',
                        'What is a protostory?',
                        'How do I create a new scene node?',
                        'What is the difference between a choice node and a scene node?',
                        'How do I connect two nodes?',
                        'What makes a good branching narrative?',
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => window.dispatchEvent(new CustomEvent('idn:chat-prompt', { detail: q }))}
                          style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #e0e7ff', background: '#fafbff', color: '#6366f1', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                }
              />
              <div style={{ padding: '10px 12px', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    ref={guideInputRef}
                    value={guideInput}
                    onChange={(e) => setGuideInput(e.target.value)}
                    onKeyDown={handleGuideKeyDown}
                    placeholder="Ask about IDN concepts or how to use this tool…"
                    rows={2}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                  <button
                    onClick={handleGuideSend}
                    disabled={!guideInput.trim() || isStreaming}
                    style={{ padding: '9px 12px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: !guideInput.trim() || isStreaming ? 'not-allowed' : 'pointer', opacity: !guideInput.trim() || isStreaming ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
                  >
                    <Send size={14} />
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#d1d5db', marginTop: 4 }}>Enter to send · Shift+Enter for new line</p>
              </div>
            </div>
          )}

          {/* ── Suggestions tab ────────────────────────────────────────────── */}
          {tab === 'suggestions' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
              {!selectedNodeId && activeSuggestions.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 24 }}>
                  <Lightbulb size={24} color="#e5e7eb" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.7 }}>
                    Select a node on the canvas to automatically receive AI branch suggestions for that node.
                  </p>
                </div>
              ) : selectedNodeId && isLoading && activeSuggestions.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>Generating suggestions…</p>
              ) : activeSuggestions.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 24 }}>
                  <Sparkles size={24} color="#e5e7eb" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.7 }}>
                    No active suggestions. Select a node to generate new ones.
                  </p>
                </div>
              ) : (
                <>
                  {selectedNodeId && (
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
                      Branch suggestions for the selected node:
                    </p>
                  )}
                  {activeSuggestions.map((s) => (
                    <SuggestionCard key={s.id} suggestion={s} selectedNodeId={selectedNodeId} />
                  ))}
                  {isLoading && (
                    <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Generating suggestions…</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Critique tab ───────────────────────────────────────────────── */}
          {tab === 'critique' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BarChart2 size={13} color="#7c3aed" /> Protostory Critique
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6, marginBottom: 10 }}>
                  AI reads through the protostory so far and provides a critical overview — themes, narrative arc, character perspectives, and quality recommendations.
                </p>
                <button
                  onClick={generateNarrativeOverview}
                  disabled={isLoading || nodes.length === 0}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 7, border: 'none',
                    background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 700,
                    cursor: isLoading || nodes.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: isLoading || nodes.length === 0 ? 0.5 : 1,
                  }}
                >
                  {isLoading ? 'Running critique…' : 'Run critique'}
                </button>
                {nodes.length === 0 && (
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Add some nodes to the canvas first.</p>
                )}
                {narrativeOverview && (
                  <div style={{ marginTop: 14, background: '#faf5ff', borderRadius: 8, padding: 14 }}>
                    <pre style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                      {narrativeOverview}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
