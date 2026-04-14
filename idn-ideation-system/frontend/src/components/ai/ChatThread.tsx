import { useEffect, useRef } from 'react'
import { useAIStore } from '../../store/aiStore'
import type { AIMessage, SearchSource } from '../../types/ai'

function SourceList({ sources }: { sources: SearchSource[] }) {
  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e0e7ff' }}>
      <p style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, margin: '0 0 4px' }}>Web sources</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={s.snippet}
            style={{ fontSize: 11, color: '#4f46e5', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            ↗ {s.title || s.url}
          </a>
        ))}
      </div>
    </div>
  )
}

function SearchIndicator({ query }: { query: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
        AI
      </div>
      <div style={{ maxWidth: '82%', padding: '9px 12px', borderRadius: '12px 12px 12px 4px', background: '#f5f3ff', color: '#6d28d9', fontSize: 12, lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: 14 }}>⟳</span>
        <span>Searching the web for <em>"{query}"</em>…</span>
      </div>
    </div>
  )
}

interface ChatThreadProps {
  // When provided, uses these instead of the Guide store values
  history?: AIMessage[]
  isStreaming?: boolean
  streamingContent?: string
  isSearching?: boolean
  currentSearchQuery?: string
  streamingSources?: SearchSource[]
  emptyState?: React.ReactNode
}

export function ChatThread({
  history: historyProp,
  isStreaming: isStreamingProp,
  streamingContent: streamingContentProp,
  isSearching: isSearchingProp,
  currentSearchQuery: searchQueryProp,
  streamingSources: streamingSourcesProp,
  emptyState,
}: ChatThreadProps) {
  const guideChatHistory = useAIStore((s) => s.chatHistory)
  const guideIsStreaming = useAIStore((s) => s.isStreaming)
  const guideStreamingContent = useAIStore((s) => s.streamingContent)
  const guideIsSearching = useAIStore((s) => s.isSearching)
  const guideSearchQuery = useAIStore((s) => s.currentSearchQuery)
  const guideStreamingSources = useAIStore((s) => s.streamingSources)

  const chatHistory = historyProp ?? guideChatHistory
  const isStreaming = isStreamingProp ?? guideIsStreaming
  const streamingContent = streamingContentProp ?? guideStreamingContent
  const isSearching = isSearchingProp ?? guideIsSearching
  const currentSearchQuery = searchQueryProp ?? guideSearchQuery
  const streamingSources = streamingSourcesProp ?? guideStreamingSources

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, streamingContent, isSearching])

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {chatHistory.length === 0 && !isStreaming && (
        emptyState ?? (
          <div style={{ textAlign: 'center', paddingTop: 24 }}>
            <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.7 }}>
              Ask me anything about IDN authoring, your story structure, or how to use this tool.
            </p>
          </div>
        )
      )}

      {chatHistory.map((msg, i) => (
        <div
          key={i}
          style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-start' }}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: msg.role === 'user' ? '#6366f1' : '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {msg.role === 'user' ? 'Y' : 'AI'}
          </div>
          <div
            style={{
              maxWidth: '82%', padding: '9px 12px',
              borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: msg.role === 'user' ? '#6366f1' : '#f5f3ff',
              color: msg.role === 'user' ? '#fff' : '#1a1a2e',
              fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          >
            {msg.content}
            {msg.sources && msg.sources.length > 0 && <SourceList sources={msg.sources} />}
          </div>
        </div>
      ))}

      {isSearching && <SearchIndicator query={currentSearchQuery} />}

      {isStreaming && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
            AI
          </div>
          <div style={{ maxWidth: '82%', padding: '9px 12px', borderRadius: '12px 12px 12px 4px', background: '#f5f3ff', color: '#1a1a2e', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {streamingContent || <span style={{ opacity: 0.4 }}>●●●</span>}
            {streamingSources.length > 0 && <SourceList sources={streamingSources} />}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
