import { Bot, ExternalLink, Mic, ShieldCheck } from 'lucide-react'

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</div>
}

export default function VoiceAgentPage() {
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
              The standalone voice agent is ready to be wired into this dashboard. This page is now the Command Centre home for it; next we connect the agent to real project, task, money, and idea actions through safe backend endpoints.
            </p>
          </div>
          <a
            href="http://127.0.0.1:8790/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            <ExternalLink className="h-4 w-4" />
            Open test agent
          </a>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Panel className="p-4">
          <Mic className="mb-3 h-5 w-5 text-indigo-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Current status</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Standalone voice test is working with LiveKit, OpenAI, Deepgram, and Cartesia.</p>
        </Panel>
        <Panel className="p-4">
          <ShieldCheck className="mb-3 h-5 w-5 text-emerald-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Safe integration</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">The dashboard keeps the Supabase anon key in the browser. Agent write actions should go through protected server endpoints.</p>
        </Panel>
        <Panel className="p-4">
          <Bot className="mb-3 h-5 w-5 text-slate-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Next actions</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Replace mock agent tools with real dashboard reads and carefully approved task/project updates.</p>
        </Panel>
      </div>
    </div>
  )
}
