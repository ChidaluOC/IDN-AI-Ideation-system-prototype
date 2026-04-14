import { api } from '../api/client'
import { useGraphStore } from '../store/graphStore'
import { useProjectStore } from '../store/projectStore'
import { useAIStore } from '../store/aiStore'
import type { NarrativeFormat } from '../types/graph'

export function useProjectIO() {
  const loadGraph = useGraphStore((s) => s.loadGraph)
  const setProject = useProjectStore((s) => s.setProject)
  const loadChatHistory = useAIStore((s) => s.loadChatHistory)

  const openProject = async (id: string) => {
    const project = await api.projects.get(id)
    loadGraph(project.nodes, project.edges)
    setProject(project.id, project.title, project.theme, project.format as NarrativeFormat)
    loadChatHistory(project.chat_history ?? [])
  }

  const createProject = async (title: string, theme: string, format: NarrativeFormat) => {
    const project = await api.projects.create(title, theme, format)
    loadGraph([], [])
    setProject(project.id, project.title, project.theme, project.format as NarrativeFormat)
    loadChatHistory([])
    return project
  }

  return { openProject, createProject }
}
