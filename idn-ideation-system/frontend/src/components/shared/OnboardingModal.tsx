import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

const STORAGE_KEY = 'idn_onboarded_v1'

const STEPS = [
  {
    title: 'Welcome to the IDN Ideation Tool',
    body: 'This tool helps you design Interactive Digital Narratives (IDNs) — stories where readers make choices and explore different paths.\n\nYou don\'t need any IDN experience to get started. This tool will guide you.',
  },
  {
    title: 'What is an IDN?',
    body: 'An IDN (Interactive Digital Narrative) is a story that branches based on reader choices. Think of it like a "choose your own adventure" — but designed with purpose.\n\nIDNs are used in journalism, education, social research, and more to represent complex, multi-perspective situations.',
  },
  {
    title: 'Building with Nodes',
    body: 'Your story is made of **nodes** — each node represents a moment, scene, or decision point.\n\nNode types:\n• **Scene** — a narrative moment\n• **Choice** — a decision point for the reader\n• **Ending** — a story conclusion\n• **Question** — a reflective prompt\n• **Note** — an author annotation',
  },
  {
    title: 'Connecting Nodes',
    body: 'Drag from the **bottom handle** of one node to the **top handle** of another to create a connection.\n\nConnections represent narrative paths — what happens next, what choice leads where.\n\nYou can label each connection to describe the path.',
  },
  {
    title: 'Your AI Assistant',
    body: 'The AI panel (right side) is your ideation partner. You can:\n• Ask questions about IDN authoring\n• Get branch suggestions for any node\n• Analyze your story\'s themes and framing\n• Check for structural issues\n• Explore alternative perspectives\n\nAll AI suggestions are optional and include an explanation of the reasoning.',
  },
  {
    title: 'Saving and Exporting',
    body: 'Your work saves automatically every 2 seconds.\n\nYou can also export your story as a **JSON file** (for backup or sharing) or a **Markdown outline** (for reading as a document).\n\nReady to start? Click "Begin" to create your first project.',
  },
]

export function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 14, width: 520, maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: '#6366f1', padding: '20px 24px 16px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
                Step {step + 1} of {STEPS.length}
              </p>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{current.title}</h2>
            </div>
            <button onClick={handleClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, padding: 4 }}>
              <X size={18} />
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.25)', borderRadius: 4, height: 4 }}>
            <div style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: '#fff', borderRadius: 4, height: '100%', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-line', margin: 0 }}>
            {current.body}
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '8px 14px', borderRadius: 7,
              border: '1px solid #e5e7eb', background: '#fff',
              color: step === 0 ? '#d1d5db' : '#374151',
              fontSize: 13, cursor: step === 0 ? 'default' : 'pointer',
            }}
          >
            <ChevronLeft size={14} /> Back
          </button>
          <button
            onClick={isLast ? handleClose : () => setStep((s) => s + 1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '8px 18px', borderRadius: 7,
              border: 'none', background: '#6366f1',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {isLast ? 'Begin' : 'Next'} {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}
