import { useEffect, useState, type ReactNode } from 'react'
import { Bot, ExternalLink, Mic, ShieldCheck } from 'lucide-react'

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</div>
}

type LocalHealth = {
  state: 'checking' | 'online' | 'offline'
  rmccMode?: 'real' | 'mock'
  rmccApiConfigured?: boolean
  livekitCredentialsSet?: boolean
}

export default function VoiceAgentPage() {
  const [health, setHealth] = useState<LocalHealth>({ state: 'checking' })

  useEffect(() => {
    const controller = new AbortController()
    fetch('http://127.0.0.1:8790/api/health', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as Omit<LocalHealth, 'state'>
        if (!response.ok) throw new Error('Voice service health check failed')
        setHealth({ state: 'online', ...data })
      })
      .catch(() => {
        if (!controller.signal.aborted) setHealth({ state: 'offline' })
      })
    return () => controller.abort()
  }, [])

  const statusLabel = health.state === 'checking' ? 'Checking local service…' : health.state === 'online' ? 'Local service online' : 'Local service offline'
  const statusClass = health.state === 'online' ? 'text-emerald-600' : health.state === 'offline' ? 'text-rose-600' : 'text-amber-600'

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">Voice Agent</h2>
                <p className="text-xs text-slate-400">LiveKit assistant connection point</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              The standalone voice agent is included in the Command Centre repository under <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">voice-agent/</code>. It now reads live RMCC data through the protected MCP bridge and previews task/project changes before asking for confirmation.
            </p>
          </div>
          <a
            href="http://127.0.0.1:8790/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            <ExternalLink className="h-4 w-4" />
            Open local test agent
          </a>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Panel className="p-4">
          <Mic className="mb-3 h-5 w-5 text-indigo-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Current status</div>
          <p className={`mt-1 text-xs font-medium ${statusClass}`}>{statusLabel}</p>
          {health.state === 'offline' ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">Run <code className="rounded bg-slate-100 px-1">.\voice-agent\run-web.ps1</code> from the Command Centre root, then refresh this page.</p>
          ) : health.state === 'online' ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">RMCC reads: {health.rmccMode === 'real' ? 'live' : 'offline fallback'} · LiveKit credentials: {health.livekitCredentialsSet ? 'configured' : 'still needed'}</p>
          ) : null}
        </Panel>
        <Panel className="p-4">
          <ShieldCheck className="mb-3 h-5 w-5 text-emerald-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Safe integration</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">The browser never receives the RMCC bearer token. Reads go through the protected MCP function, and writes require explicit confirmation plus an audit event.</p>
        </Panel>
        <Panel className="p-4">
          <Bot className="mb-3 h-5 w-5 text-slate-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Available actions</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Read focus, projects, stale work, overdue tasks, money, and summaries. Prepare confirmed task/project updates without exposing money edits or deletion.</p>
        </Panel>
      </div>
    </div>
  )
}
