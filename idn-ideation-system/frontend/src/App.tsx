import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Save } from 'lucide-react'

import { GraphCanvas } from './components/graph/GraphCanvas'
import { GraphToolbar } from './components/graph/GraphToolbar'
import { NodeInspector } from './components/graph/NodeInspector'
import { NodeList } from './components/graph/NodeList'
import { ExportPanel } from './components/project/ExportPanel'
import { ProjectSwitcher } from './components/project/ProjectSwitcher'
import { AIPanel } from './components/ai/AIPanel'
import { OnboardingModal } from './components/shared/OnboardingModal'
import { PreviewModal } from './components/preview/PreviewModal'
import { TrackingPanel } from './components/tracking/TrackingPanel'

import { useAutoSave } from './hooks/useAutoSave'
import { useProjectStore } from './store/projectStore'
import { useGraphStore } from './store/graphStore'

const queryClient = new QueryClient()

function AppShell() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [aiCollapsed, setAiCollapsed] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)

  const { projectId, isSaving } = useProjectStore()
  const requestFocusNode = useGraphStore((s) => s.requestFocusNode)

  useAutoSave()

  function handleNodeSelect(id: string | null) {
    setSelectedNodeId(id)
  }

  function handleNodeListSelect(id: string) {
    setSelectedNodeId(id)
    requestFocusNode(id)
  }

  function handleFocusFromTracking(id: string) {
    setSelectedNodeId(id)
    requestFocusNode(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f8f8f8' }}>
      {/* Top bar */}
      <div
        style={{
          height: 48, background: '#1a1a2e', display: 'flex',
          alignItems: 'center', padding: '0 16px', gap: 12,
          flexShrink: 0, zIndex: 10,
        }}
      >
        {/* Project switcher — top-left */}
        <ProjectSwitcher onProjectOpen={() => setSelectedNodeId(null)} />

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />

        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.3 }}>
          IDN Ideation Tool
        </span>

        {isSaving && (
          <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Save size={11} /> Saving…
          </span>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <ExportPanel />
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left column: Node list (always shown when project open) */}
        {projectId && (
          <NodeList onNodeSelect={handleNodeListSelect} />
        )}

        {/* Canvas area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {projectId ? (
            <>
              <GraphToolbar
                onOpenPreview={() => setPreviewOpen(true)}
                onOpenTracking={() => setTrackingOpen(true)}
              />
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <GraphCanvas onNodeSelect={handleNodeSelect} />
                {selectedNodeId && (
                  <NodeInspector
                    nodeId={selectedNodeId}
                    onClose={() => setSelectedNodeId(null)}
                    onOpenAIPanel={() => setAiCollapsed(false)}
                  />
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 14, color: '#9ca3af',
              }}
            >
              <div style={{ fontSize: 36 }}>📖</div>
              <p style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.7, maxWidth: 320, color: '#6b7280' }}>
                Use the project switcher in the top-left corner to create or open a project.
              </p>
            </div>
          )}
        </div>

        {/* AI panel */}
        <AIPanel collapsed={aiCollapsed} onToggle={() => setAiCollapsed(!aiCollapsed)} />
      </div>

      {/* Modals */}
      {previewOpen && <PreviewModal onClose={() => setPreviewOpen(false)} />}
      {trackingOpen && (
        <TrackingPanel
          onClose={() => setTrackingOpen(false)}
          onFocusNode={handleFocusFromTracking}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingModal />
      <AppShell />
    </QueryClientProvider>
  )
}

export default App
