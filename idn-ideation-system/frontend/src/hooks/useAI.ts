import { useCallback } from 'react'
import { api } from '../api/client'
import { useAIStore } from '../store/aiStore'
import { useGraphStore } from '../store/graphStore'
import { useProjectStore } from '../store/projectStore'
import type { StoryNode, StoryEdge } from '../types/graph'

function buildGraphContext(nodes: ReturnType<typeof useGraphStore.getState>['nodes'], theme: string, format: string) {
  return {
    node_count: nodes.length,
    node_titles: nodes.map((n) => n.data.title),
    theme,
    format,
  }
}

function buildNodeDetails(nodes: ReturnType<typeof useGraphStore.getState>['nodes']) {
  return nodes.map((n) => ({
    id: n.id,
    title: n.data.title,
    body: n.data.body,
    node_type: n.data.nodeType,
  }))
}

export function useAI() {
  const store = useAIStore()
  const nodes = useGraphStore((s) => s.nodes)
  const { projectId, theme, format } = useProjectStore()

  // ── IDN Guide (chat) ──────────────────────────────────────────────────────

  const sendChatMessage = useCallback(async (content: string) => {
    if (!projectId) return
    store.addUserMessage(content)
    store.startAssistantMessage()

    const messages = [
      ...store.chatHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content },
    ]
    const graphContext = buildGraphContext(nodes, theme, format)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, messages, graph_context: graphContext }),
      })

      if (!response.body) throw new Error('No response body')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'search_start') store.setSearching(parsed.query)
              else if (parsed.type === 'search_done') store.addStreamingSources(parsed.sources ?? [])
              else if (parsed.text !== undefined) store.appendStreamChunk(parsed.text)
            } catch { /* ignore */ }
          }
        }
      }
    } finally {
      store.finalizeAssistantMessage()
    }
  }, [projectId, nodes, theme, format, store])

  // ── Co-author: ideate mode ────────────────────────────────────────────────

  const sendCoAuthorMessage = useCallback(async (content: string) => {
    if (!projectId) return
    store.addCoAuthorUserMessage(content)
    store.startCoAuthorStream()

    // Send the full co-author conversation history
    const history = useAIStore.getState().coAuthorHistory
    const messages = [
      ...history.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content },
    ]
    const graphContext = buildGraphContext(nodes, theme, format)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, messages, graph_context: graphContext }),
      })

      if (!response.body) throw new Error('No response body')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'search_start') store.setCoAuthorSearching(parsed.query)
              else if (parsed.type === 'search_done') store.addCoAuthorStreamingSources(parsed.sources ?? [])
              else if (parsed.text !== undefined) store.appendCoAuthorStreamChunk(parsed.text)
            } catch { /* ignore */ }
          }
        }
      }
    } finally {
      store.finalizeCoAuthorStream()
    }
  }, [projectId, nodes, theme, format, store])

  // ── Co-author: generate mode ──────────────────────────────────────────────

  const generateFromCoAuthor = useCallback(async (premise: string, replace: boolean) => {
    if (!projectId) return
    store.setGenerationState('generating')
    store.addCoAuthorAIMessage('Got it — generating your narrative now. This may take a moment…')

    try {
      const result = await api.ai.generateNarrative(projectId, premise)

      // Remap backend IDs to G-prefixed IDs
      let aiCounter = 1
      const idMap: Record<string, string> = {}
      const mappedNodes: StoryNode[] = result.nodes.map((n) => {
        const newId = `G${aiCounter++}`
        idMap[n.id] = newId
        return {
          id: newId,
          type: 'storyNode' as const,
          position: { x: n.x, y: n.y },
          data: {
            title: n.title,
            body: n.body,
            nodeType: n.node_type as StoryNode['data']['nodeType'],
            tags: n.tags,
            aiGenerated: true,
          },
        }
      })
      const mappedEdges: StoryEdge[] = result.edges.map((e, i) => ({
        id: `Ge${i + 1}`,
        source: idMap[e.source] ?? e.source,
        target: idMap[e.target] ?? e.target,
        label: e.label,
        type: 'default',
      }))

      useGraphStore.getState().proposePendingGraph(mappedNodes, mappedEdges, replace)
      store.setGenerationState('pending_confirmation')
      store.addCoAuthorAIMessage(
        `Done! I've added ${mappedNodes.length} proposed nodes to the canvas — they're highlighted in orange. ` +
        `Click on any highlighted node to inspect it. When you're ready, confirm to make the changes permanent, or reject to restore the previous canvas.`
      )
    } catch (err) {
      store.setGenerationState('idle')
      store.addCoAuthorAIMessage(
        `Something went wrong during generation: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`
      )
    }
  }, [projectId, store])

  const confirmGeneration = useCallback(() => {
    useGraphStore.getState().confirmPendingGraph()
    store.setGenerationState('idle')
    store.setPendingScopeRequest(null)
    store.addCoAuthorAIMessage('Changes confirmed! The new nodes are now a permanent part of your protostory. Feel free to edit them or keep building.')
  }, [store])

  const rejectGeneration = useCallback(() => {
    useGraphStore.getState().rejectPendingGraph()
    store.setGenerationState('idle')
    store.setPendingScopeRequest(null)
    store.addCoAuthorAIMessage("No problem — I've restored the canvas to its previous state. Let's keep working on it.")
  }, [store])

  // ── Suggestions ───────────────────────────────────────────────────────────

  const requestBranches = useCallback(async (nodeId: string) => {
    if (!projectId) return
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    store.setIsLoading(true)
    try {
      const gc = buildGraphContext(nodes, theme, format)
      const result = await api.ai.branches(
        projectId,
        { id: node.id, title: node.data.title, body: node.data.body, node_type: node.data.nodeType },
        gc,
      )
      store.setSuggestions(result.suggestions)
    } finally {
      store.setIsLoading(false)
    }
  }, [projectId, nodes, theme, format, store])

  // ── Analysis ──────────────────────────────────────────────────────────────

  const checkCoherence = useCallback(async () => {
    if (!projectId) return
    store.setIsLoading(true)
    try {
      const gc = buildGraphContext(nodes, theme, format)
      const result = await api.ai.coherenceCheck(projectId, buildNodeDetails(nodes), gc)
      store.setCoherenceResult(result.issues, result.overall_assessment)
    } finally {
      store.setIsLoading(false)
    }
  }, [projectId, nodes, theme, format, store])

  const generateNarrativeOverview = useCallback(async () => {
    if (!projectId) return
    store.setIsLoading(true)
    try {
      const gc = buildGraphContext(nodes, theme, format)
      const result = await api.ai.narrativeOverview(projectId, buildNodeDetails(nodes), gc)
      store.setNarrativeOverview(result.overview)
    } finally {
      store.setIsLoading(false)
    }
  }, [projectId, nodes, theme, format, store])

  // ── Legacy (still used by NodeInspector) ──────────────────────────────────

  const analyzeTheme = useCallback(async (premise: string) => {
    if (!projectId) return
    store.setIsLoading(true)
    try {
      const gc = buildGraphContext(nodes, theme, format)
      const result = await api.ai.themeAnalysis(projectId, premise, gc)
      store.setThemeAnalysis(result.analysis)
    } finally {
      store.setIsLoading(false)
    }
  }, [projectId, nodes, theme, format, store])

  const requestPerspective = useCallback(async (nodeId: string) => {
    if (!projectId) return
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    store.setIsLoading(true)
    try {
      const gc = buildGraphContext(nodes, theme, format)
      const result = await api.ai.perspective(
        projectId,
        { id: node.id, title: node.data.title, body: node.data.body, node_type: node.data.nodeType },
        gc,
      )
      store.setPerspectiveSuggestion(result.suggestion)
    } finally {
      store.setIsLoading(false)
    }
  }, [projectId, nodes, theme, format, store])

  const generateNarrative = useCallback(async (premise: string) => {
    if (!projectId) return
    store.setIsLoading(true)
    try {
      const result = await api.ai.generateNarrative(projectId, premise)
      let aiCounter = 1
      const idMap: Record<string, string> = {}
      const mappedNodes: StoryNode[] = result.nodes.map((n) => {
        const newId = `G${aiCounter++}`
        idMap[n.id] = newId
        return {
          id: newId,
          type: 'storyNode' as const,
          position: { x: n.x, y: n.y },
          data: {
            title: n.title,
            body: n.body,
            nodeType: n.node_type as StoryNode['data']['nodeType'],
            tags: n.tags,
            aiGenerated: true,
          },
        }
      })
      const mappedEdges: StoryEdge[] = result.edges.map((e, i) => ({
        id: `Ge${i + 1}`,
        source: idMap[e.source] ?? e.source,
        target: idMap[e.target] ?? e.target,
        label: e.label,
        type: 'default',
      }))
      useGraphStore.getState().loadGraph(mappedNodes, mappedEdges)
    } finally {
      store.setIsLoading(false)
    }
  }, [projectId, store])

  return {
    sendChatMessage,
    sendCoAuthorMessage,
    generateFromCoAuthor,
    confirmGeneration,
    rejectGeneration,
    requestBranches,
    checkCoherence,
    generateNarrativeOverview,
    analyzeTheme,
    requestPerspective,
    generateNarrative,
  }
}
