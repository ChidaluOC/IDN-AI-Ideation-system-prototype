import { create } from 'zustand'
import type { NarrativeFormat } from '../types/graph'

interface ProjectState {
  projectId: string | null
  title: string
  theme: string
  format: NarrativeFormat
  isSaving: boolean

  setProject: (id: string, title: string, theme: string, format: NarrativeFormat) => void
  setTitle: (title: string) => void
  setTheme: (theme: string) => void
  setFormat: (format: NarrativeFormat) => void
  setIsSaving: (v: boolean) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>()((set) => ({
  projectId: null,
  title: '',
  theme: '',
  format: 'branching',
  isSaving: false,

  setProject: (id, title, theme, format) => set({ projectId: id, title, theme, format }),
  setTitle: (title) => set({ title }),
  setTheme: (theme) => set({ theme }),
  setFormat: (format) => set({ format }),
  setIsSaving: (v) => set({ isSaving: v }),
  clearProject: () => set({ projectId: null, title: '', theme: '', format: 'branching' }),
}))
