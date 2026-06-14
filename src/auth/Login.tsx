import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/auth/AuthProvider'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await signIn(email.trim(), password)
    if (res.error) setError(res.error)
    setBusy(false)
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <div className="text-center leading-tight">
            <div className="font-display text-[11px] font-semibold tracking-[0.18em] text-slate-500">RACE MEDIA</div>
            <div className="font-display text-base font-bold tracking-wide text-slate-100">CONTROL CENTRE</div>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <label className="mb-1.5 block text-xs font-medium text-slate-400" htmlFor="email">Email</label>
          <input
            id="email" type="email" autoComplete="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
            placeholder="you@racemediagroup.co.uk"
          />
          <label className="mb-1.5 block text-xs font-medium text-slate-400" htmlFor="password">Password</label>
          <input
            id="password" type="password" autoComplete="current-password" required value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
            placeholder="••••••••"
          />
          {error && (
            <p className="mb-4 rounded-lg bg-rose-950/60 px-3 py-2 text-xs text-rose-300">{error}</p>
          )}
          <button
            type="submit" disabled={busy}
            className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-200 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-[11px] text-slate-600">Private dashboard · authorised access only</p>
      </div>
    </div>
  )
}
