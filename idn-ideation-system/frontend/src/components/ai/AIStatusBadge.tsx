import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Zap, FlaskConical } from 'lucide-react'
import { api } from '../../api/client'
import { useAIStore } from '../../store/aiStore'

export function AIStatusBadge() {
  const setMode = useAIStore((s) => s.setMode)
  const mode = useAIStore((s) => s.mode)

  const { data } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => api.ai.status(),
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (data) setMode(data.mode as 'live' | 'mock')
  }, [data])

  const isLive = mode === 'live'

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 20,
        background: isLive ? '#dcfce7' : '#fef9c3',
        color: isLive ? '#15803d' : '#92400e',
        fontSize: 11, fontWeight: 600,
        border: `1px solid ${isLive ? '#bbf7d0' : '#fde68a'}`,
      }}
      title={isLive ? 'Connected to Claude AI' : 'Demo mode — add an API key for live AI'}
    >
      {isLive ? <Zap size={10} /> : <FlaskConical size={10} />}
      {isLive ? 'Live AI' : 'Demo Mode'}
    </span>
  )
}
