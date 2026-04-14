import { Download } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'
import { useGraphStore } from '../../store/graphStore'
import { api } from '../../api/client'

function buildMarkdown(
  title: string,
  theme: string,
  format: string,
  nodes: ReturnType<typeof useGraphStore.getState>['nodes'],
  edges: ReturnType<typeof useGraphStore.getState>['edges'],
): string {
  const lines = [
    `# ${title}`,
    theme ? `**Theme:** ${theme}` : '',
    `**Format:** ${format}`,
    '',
    '## Story Nodes',
    '',
  ]
  for (const node of nodes) {
    lines.push(`### [${node.data.nodeType.toUpperCase()}] ${node.data.title}`)
    if (node.data.body) lines.push(node.data.body)
    if (node.data.tags.length) lines.push(`*Tags: ${node.data.tags.join(', ')}*`)
    const outgoing = edges.filter((e) => e.source === node.id)
    if (outgoing.length) {
      lines.push('**Connections:**')
      for (const edge of outgoing) {
        const target = nodes.find((n) => n.id === edge.target)
        lines.push(`- ${edge.label || '→'} **${target?.data.title ?? edge.target}**`)
      }
    }
    lines.push('')
  }
  return lines.filter((l) => l !== undefined).join('\n')
}

export function ExportPanel() {
  const { projectId, title, theme, format } = useProjectStore()
  const nodes = useGraphStore((s) => s.nodes)
  const edges = useGraphStore((s) => s.edges)

  if (!projectId) return null

  const exportJSON = () => {
    window.open(api.projects.exportUrl(projectId), '_blank')
  }

  const exportMarkdown = () => {
    const md = buildMarkdown(title, theme, format, nodes, edges)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = title.replace(/\s+/g, '_').toLowerCase() + '.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={exportJSON} style={btnStyle} title="Download project as JSON">
        <Download size={13} /> JSON
      </button>
      <button onClick={exportMarkdown} style={btnStyle} title="Download story outline as Markdown">
        <Download size={13} /> Markdown
      </button>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4,
  padding: '5px 10px', borderRadius: 6,
  border: '1px solid #e5e7eb', background: '#fff',
  color: '#6b7280', fontSize: 12, cursor: 'pointer',
}
