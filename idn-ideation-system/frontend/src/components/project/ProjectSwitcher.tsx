import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Plus, FolderOpen, Trash2, Check } from 'lucide-react'
import { api } from '../../api/client'
import { useProjectIO } from '../../hooks/useProjectIO'
import { useProjectStore } from '../../store/projectStore'
import type { NarrativeFormat } from '../../types/graph'

interface ProjectSwitcherProps {
  onProjectOpen: () => void
}

export function ProjectSwitcher({ onProjectOpen }: ProjectSwitcherProps) {
  const qc = useQueryClient()
  const { openProject, createProject } = useProjectIO()
  const { projectId, title } = useProjectStore()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTheme, setNewTheme] = useState('')
  const [newFormat] = useState<NarrativeFormat>('branching')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus title input when create modal opens
  useEffect(() => {
    if (createOpen) setTimeout(() => titleInputRef.current?.focus(), 50)
  }, [createOpen])

  async function handleOpen(id: string) {
    setDropdownOpen(false)
    await openProject(id)
    onProjectOpen()
    qc.invalidateQueries({ queryKey: ['projects'] })
  }

  async function handleCreate() {
    if (!newTitle.trim()) return
    setCreateOpen(false)
    await createProject(newTitle.trim(), newTheme.trim(), newFormat)
    qc.invalidateQueries({ queryKey: ['projects'] })
    setNewTitle('')
    setNewTheme('')
    onProjectOpen()
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this project? This cannot be undone.')) return
    await api.projects.delete(id)
    qc.invalidateQueries({ queryKey: ['projects'] })
  }

  const displayTitle = projectId ? title : 'No project open'

  return (
    <>
      {/* Project switcher button */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.15)',
            background: dropdownOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: '#fff', cursor: 'pointer',
            maxWidth: 220, transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{
            fontSize: 13, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160,
          }}>
            {displayTitle}
          </span>
          <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 500,
              background: '#fff', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
              minWidth: 260, overflow: 'hidden',
              border: '1px solid #e5e7eb',
            }}
          >
            {/* New project button */}
            <button
              onClick={() => { setDropdownOpen(false); setCreateOpen(true) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 14px', background: '#6366f1', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              }}
            >
              <Plus size={14} /> New Project
            </button>

            {/* Project list */}
            <div style={{ maxHeight: 320, overflow: 'auto' }}>
              {projects.length === 0 && (
                <div style={{ padding: '16px 14px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                  No projects yet.
                </div>
              )}
              {projects.map((p) => {
                const isCurrent = p.id === projectId
                return (
                  <div
                    key={p.id}
                    onClick={() => !isCurrent && handleOpen(p.id)}
                    style={{
                      padding: '10px 14px', borderTop: '1px solid #f3f4f6',
                      cursor: isCurrent ? 'default' : 'pointer',
                      background: isCurrent ? '#eff6ff' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                    onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = '#f9fafb' }}
                    onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', background: '#e0e7ff', padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                            Current
                          </span>
                        )}
                      </div>
                      {p.theme && (
                        <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.theme}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        {p.node_count} nodes · {p.format}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {isCurrent ? (
                        <Check size={14} color="#6366f1" />
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpen(p.id) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 3 }}
                            title="Open"
                          >
                            <FolderOpen size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, p.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 3 }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create project modal */}
      {createOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setCreateOpen(false) }}
        >
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, width: 380,
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 20 }}>
              New Project
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={modalLabelStyle}>Project title *</label>
                <input
                  ref={titleInputRef}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. The Malta Transport Crisis"
                  style={modalInputStyle}
                />
              </div>
              <div>
                <label style={modalLabelStyle}>Theme / topic</label>
                <input
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. urban mobility, climate policy…"
                  style={modalInputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: newTitle.trim() ? '#6366f1' : '#e5e7eb',
                  color: newTitle.trim() ? '#fff' : '#9ca3af',
                  fontSize: 13, fontWeight: 700, cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Create
              </button>
              <button
                onClick={() => setCreateOpen(false)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8,
                  border: '1px solid #e5e7eb', background: '#fff',
                  color: '#6b7280', fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const modalLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6,
}

const modalInputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid #d1d5db',
  fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
