import { useEffect, useMemo, useState } from 'react'
import { Bot, CheckCircle2, Copy, Plug, ShieldCheck, XCircle } from 'lucide-react'

type McpStatus = {
  ok?: boolean
  name?: string
  mcp?: string
  configured?: boolean
  tools?: string[]
}

export default function AIAccessPage() {
  const endpoint = useMemo(() => `${window.location.origin}/mcp`, [])
  const [status, setStatus] = useState<McpStatus | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/mcp', { headers: { Accept: 'application/json' } })
        const data = await res.json() as McpStatus
        setStatus(data)
      } catch {
        setStatus({ ok: false, configured: false })
      }
    }
    void check()
  }, [])

  async function copyEndpoint() {
    await navigator.clipboard.writeText(endpoint)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const isConfigured = !!status?.configured

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Plug className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">AI Access</h2>
                <p className="text-xs text-slate-400">MCP endpoint for Codex, ChatGPT, Claude, and the voice agent</p>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              The live dashboard now has a real MCP endpoint path instead of falling back to the React HTML page. Keep it token-protected before giving it to any AI client.
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
            {isConfigured ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {isConfigured ? 'Configured' : 'Needs secrets'}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 ff-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">MCP endpoint</div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <code className="min-w-0 flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{endpoint}</code>
          <button onClick={copyEndpoint} className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            <Copy className="h-4 w-4" />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <Bot className="mb-3 h-5 w-5 text-indigo-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Available tools</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{status?.tools?.join(', ') || 'Tools appear after backend secrets are configured.'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <ShieldCheck className="mb-3 h-5 w-5 text-emerald-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Access token</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Set RMCC_MCP_TOKEN in Cloudflare. AI clients must send it as a bearer token.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <Plug className="mb-3 h-5 w-5 text-slate-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Supabase bridge</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for live Command Centre reads.</p>
        </div>
      </div>
    </div>
  )
}
