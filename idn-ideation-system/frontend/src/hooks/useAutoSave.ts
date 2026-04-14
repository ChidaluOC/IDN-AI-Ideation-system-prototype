import { useEffect, useRef } from 'react'
import { useGraphStore } from '../store/graphStore'
import { useProjectStore } from '../store/projectStore'
import { useAIStore } from '../store/aiStore'
import { api } from '../api/client'

const DEBOUNCE_MS = 2000

export function useAutoSave() {
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)
  const isDirty = useGraphStore((s) => s.isDirty)
  const setIsDirty = useGraphStore((s) => s.setIsDirty)
  const { projectId, title, theme, format, setIsSaving } = useProjectStore()
  const chatHistory = useAIStore((s) => s.chatHistory)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isDirty || !projectId) return

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await api.projects.save(projectId, {
          title,
          theme,
          format,
          nodes,
          edges,
          chat_history: chatHistory,
        })
        setIsDirty(false)
      } catch (e) {
        console.error('Auto-save failed:', e)
      } finally {
        setIsSaving(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [isDirty, nodes, edges, projectId])
}
