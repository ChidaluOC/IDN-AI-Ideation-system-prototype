import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, FolderOpen, Trash2, BookOpen } from 'lucide-react'
import { api } from '../../api/client'
import { useProjectIO } from '../../hooks/useProjectIO'
import { useProjectStore } from '../../store/projectStore'
import type { NarrativeFormat } from '../../types/graph'

export function ProjectSidebar({ onProjectOpen }: { onProjectOpen: () => void }) {
  const qc = useQueryClient()
  const { openProject, createProject } = useProjectIO()
  const currentId = useProjectStore((s) => s.projectId)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })

  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTheme, setNewTheme] = useState('')
  const [newFormat, setNewFormat] = useState<NarrativeFormat>('branching')

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    await createProject(newTitle.trim(), newTheme.trim(), newFormat)
    qc.invalidateQueries({ queryKey: ['projects'] })
    setShowCreate(false)
    setNewTitle('')
    setNewTheme('')
    onProjectOpen()
  }

  const handleOpen = async (id: string) => {
    await openProject(id)
    onProjectOpen()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this project? This cannot be undone.')) return
    await api.projects.delete(id)
    qc.invalidateQueries({ queryKey: ['projects'] })
  }

  return (
    <div
      style={{
        width: 260,
        background: '#fff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={16} color="#6366f1" />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>IDN Projects</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          title="New project"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 6,
            border: '1.5px solid #6366f1', background: '#6366f1',
            color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={12} /> New
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ padding: 14, borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>New project</p>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Project title *"
            autoFocus
            style={createInputStyle}
          />
          <input
            value={newTheme}
            onChange={(e) => setNewTheme(e.target.value)}
            placeholder="Theme / topic (optional)"
            style={{ ...createInputStyle, marginTop: 8 }}
          />
          <select
            value={newFormat}
            onChange={(e) => setNewFormat(e.target.value as NarrativeFormat)}
            style={{ ...createInputStyle, marginTop: 8, background: '#fff', cursor: 'pointer' }}
          >
            <option value="branching">Branching narrative</option>
            <option value="hypertext">Hypertext narrative</option>
          </select>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleCreate} style={primaryBtnStyle}>Create</button>
            <button onClick={() => setShowCreate(false)} style={ghostBtnStyle}>Cancel</button>
          </div>
        </div>
      )}

      {/* Project list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading && (
          <p style={{ padding: 16, fontSize: 12, color: '#9ca3af' }}>Loading…</p>
        )}
        {!isLoading && projects.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6 }}>
              No projects yet. Create your first IDN story above.
            </p>
          </div>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => handleOpen(p.id)}
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid #f3f4f6',
              cursor: 'pointer',
              background: currentId === p.id ? '#eff6ff' : 'transparent',
              borderLeft: currentId === p.id ? '3px solid #6366f1' : '3px solid transparent',
              transition: 'background 0.1s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </div>
                {p.theme && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.theme}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>{p.node_count} nodes</span>
                  <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize' }}>{p.format}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpen(p.id) }}
                  title="Open"
                  style={iconBtnStyle}
                >
                  <FolderOpen size={13} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, p.id)}
                  title="Delete"
                  style={{ ...iconBtnStyle, color: '#ef4444' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const createInputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: '1px solid #d1d5db', fontSize: 12, outline: 'none', fontFamily: 'inherit',
}
const primaryBtnStyle: React.CSSProperties = {
  flex: 1, padding: '7px 0', borderRadius: 6,
  border: 'none', background: '#6366f1', color: '#fff',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
}
const ghostBtnStyle: React.CSSProperties = {
  flex: 1, padding: '7px 0', borderRadius: 6,
  border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280',
  fontSize: 12, cursor: 'pointer',
}
const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#9ca3af', padding: 3, display: 'flex', alignItems: 'center',
}
