import { create } from 'zustand'
import type { AIMessage, AIMode, BranchSuggestion, CoAuthorMode, CoherenceIssue, GenerationState, PerspectiveSuggestion, SearchSource, ThemeAnalysis } from '../types/ai'

interface AIState {
  // Service mode
  mode: AIMode

  // IDN Guide chat
  chatHistory: AIMessage[]
  isStreaming: boolean
  streamingContent: string
  isSearching: boolean
  currentSearchQuery: string
  streamingSources: SearchSource[]

  // Co-author
  coAuthorMode: CoAuthorMode
  coAuthorHistory: AIMessage[]
  coAuthorIsStreaming: boolean
  coAuthorStreamingContent: string
  coAuthorIsSearching: boolean
  coAuthorSearchQuery: string
  coAuthorStreamingSources: SearchSource[]
  generationState: GenerationState
  pendingScopeRequest: string | null

  // Shared loading state (non-streaming AI calls)
  isLoading: boolean

  // Suggestions tab
  suggestions: BranchSuggestion[]

  // Analysis tab
  themeAnalysis: ThemeAnalysis | null
  coherenceIssues: CoherenceIssue[] | null
  coherenceAssessment: string
  narrativeOverview: string | null

  // Other
  perspectiveSuggestion: PerspectiveSuggestion | null

  // ── Actions ──────────────────────────────────────────────────────────────

  setMode: (mode: AIMode) => void

  // Guide
  addUserMessage: (content: string) => void
  startAssistantMessage: () => void
  appendStreamChunk: (chunk: string) => void
  setSearching: (query: string | null) => void
  addStreamingSources: (sources: SearchSource[]) => void
  finalizeAssistantMessage: () => void
  loadChatHistory: (history: AIMessage[]) => void

  // Co-author
  setCoAuthorMode: (mode: CoAuthorMode) => void
  addCoAuthorUserMessage: (content: string) => void
  addCoAuthorAIMessage: (content: string) => void
  startCoAuthorStream: () => void
  appendCoAuthorStreamChunk: (chunk: string) => void
  setCoAuthorSearching: (query: string | null) => void
  addCoAuthorStreamingSources: (sources: SearchSource[]) => void
  finalizeCoAuthorStream: () => void
  setGenerationState: (state: GenerationState) => void
  setPendingScopeRequest: (req: string | null) => void

  // Suggestions
  setSuggestions: (s: BranchSuggestion[]) => void
  dismissSuggestion: (id: string) => void
  clearSuggestions: () => void

  // Analysis
  setThemeAnalysis: (a: ThemeAnalysis) => void
  setCoherenceResult: (issues: CoherenceIssue[], assessment: string) => void
  setNarrativeOverview: (overview: string | null) => void

  // Other
  setPerspectiveSuggestion: (s: PerspectiveSuggestion) => void
  setIsLoading: (v: boolean) => void
}

export const useAIStore = create<AIState>()((set) => ({
  mode: 'mock',

  // Guide
  chatHistory: [],
  isStreaming: false,
  streamingContent: '',
  isSearching: false,
  currentSearchQuery: '',
  streamingSources: [],

  // Co-author
  coAuthorMode: 'ideate',
  coAuthorHistory: [],
  coAuthorIsStreaming: false,
  coAuthorStreamingContent: '',
  coAuthorIsSearching: false,
  coAuthorSearchQuery: '',
  coAuthorStreamingSources: [],
  generationState: 'idle',
  pendingScopeRequest: null,

  // Shared
  isLoading: false,

  // Suggestions
  suggestions: [],

  // Analysis
  themeAnalysis: null,
  coherenceIssues: null,
  coherenceAssessment: '',
  narrativeOverview: null,

  // Other
  perspectiveSuggestion: null,

  // ── Guide actions ─────────────────────────────────────────────────────────

  setMode: (mode) => set({ mode }),

  addUserMessage: (content) =>
    set((s) => ({
      chatHistory: [...s.chatHistory, { role: 'user', content, timestamp: new Date().toISOString() }],
    })),

  startAssistantMessage: () =>
    set({ isStreaming: true, streamingContent: '', isSearching: false, currentSearchQuery: '', streamingSources: [] }),

  appendStreamChunk: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),

  setSearching: (query) =>
    set(query !== null
      ? { isSearching: true, currentSearchQuery: query }
      : { isSearching: false, currentSearchQuery: '' }
    ),

  addStreamingSources: (sources) =>
    set((s) => ({ isSearching: false, currentSearchQuery: '', streamingSources: [...s.streamingSources, ...sources] })),

  finalizeAssistantMessage: () =>
    set((s) => ({
      isStreaming: false,
      isSearching: false,
      currentSearchQuery: '',
      chatHistory: [
        ...s.chatHistory,
        {
          role: 'assistant',
          content: s.streamingContent,
          timestamp: new Date().toISOString(),
          sources: s.streamingSources.length > 0 ? s.streamingSources : undefined,
        },
      ],
      streamingContent: '',
      streamingSources: [],
    })),

  loadChatHistory: (chatHistory) => set({ chatHistory }),

  // ── Co-author actions ─────────────────────────────────────────────────────

  setCoAuthorMode: (coAuthorMode) => set({ coAuthorMode }),

  addCoAuthorUserMessage: (content) =>
    set((s) => ({
      coAuthorHistory: [...s.coAuthorHistory, { role: 'user', content, timestamp: new Date().toISOString() }],
    })),

  addCoAuthorAIMessage: (content) =>
    set((s) => ({
      coAuthorHistory: [...s.coAuthorHistory, { role: 'assistant', content, timestamp: new Date().toISOString() }],
    })),

  startCoAuthorStream: () =>
    set({ coAuthorIsStreaming: true, coAuthorStreamingContent: '', coAuthorIsSearching: false, coAuthorSearchQuery: '', coAuthorStreamingSources: [] }),

  appendCoAuthorStreamChunk: (chunk) =>
    set((s) => ({ coAuthorStreamingContent: s.coAuthorStreamingContent + chunk })),

  setCoAuthorSearching: (query) =>
    set(query !== null
      ? { coAuthorIsSearching: true, coAuthorSearchQuery: query }
      : { coAuthorIsSearching: false, coAuthorSearchQuery: '' }
    ),

  addCoAuthorStreamingSources: (sources) =>
    set((s) => ({ coAuthorIsSearching: false, coAuthorSearchQuery: '', coAuthorStreamingSources: [...s.coAuthorStreamingSources, ...sources] })),

  finalizeCoAuthorStream: () =>
    set((s) => ({
      coAuthorIsStreaming: false,
      coAuthorIsSearching: false,
      coAuthorSearchQuery: '',
      coAuthorHistory: [
        ...s.coAuthorHistory,
        {
          role: 'assistant',
          content: s.coAuthorStreamingContent,
          timestamp: new Date().toISOString(),
          sources: s.coAuthorStreamingSources.length > 0 ? s.coAuthorStreamingSources : undefined,
        },
      ],
      coAuthorStreamingContent: '',
      coAuthorStreamingSources: [],
    })),

  setGenerationState: (generationState) => set({ generationState }),
  setPendingScopeRequest: (pendingScopeRequest) => set({ pendingScopeRequest }),

  // ── Suggestions ───────────────────────────────────────────────────────────

  setSuggestions: (suggestions) => set({ suggestions }),

  dismissSuggestion: (id) =>
    set((s) => ({ suggestions: s.suggestions.map((s) => s.id === id ? { ...s, dismissed: true } : s) })),

  clearSuggestions: () => set({ suggestions: [] }),

  // ── Analysis ──────────────────────────────────────────────────────────────

  setThemeAnalysis: (themeAnalysis) => set({ themeAnalysis }),

  setCoherenceResult: (coherenceIssues, coherenceAssessment) =>
    set({ coherenceIssues, coherenceAssessment }),

  setNarrativeOverview: (narrativeOverview) => set({ narrativeOverview }),

  // ── Other ─────────────────────────────────────────────────────────────────

  setPerspectiveSuggestion: (perspectiveSuggestion) => set({ perspectiveSuggestion }),
  setIsLoading: (isLoading) => set({ isLoading }),
}))
