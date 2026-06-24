import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, Download, Smartphone, XCircle } from 'lucide-react'
import { getPushSubscription, pushConfigured, pushSupported, subscribeToPush, unsubscribeFromPush } from '@/lib/push'

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 md:p-5 ${className}`}>{children}</div>
}

export default function NotificationsPage() {
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const supported = pushSupported()
  const configured = pushConfigured()

  useEffect(() => {
    if (!supported) return
    getPushSubscription().then((subscription) => setSubscribed(!!subscription)).catch(() => setSubscribed(false))
  }, [supported])

  async function enable() {
    setBusy(true)
    setMessage(null)
    try {
      await subscribeToPush()
      setSubscribed(true)
      setMessage('This device is subscribed for Command Centre reminders.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not enable notifications')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    setMessage(null)
    try {
      await unsubscribeFromPush()
      setSubscribed(false)
      setMessage('Notifications disabled on this device.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not disable notifications')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Bell className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">Phone notifications</h2>
                <p className="text-xs text-slate-400">Android-friendly PWA reminders</p>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Install the Command Centre on your Android phone, then enable reminders here. The next layer will send alerts for task deadlines, project due dates, stale projects, unpaid money, and calendar events.
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${subscribed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {subscribed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {subscribed ? 'Enabled' : 'Not enabled'}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <Download className="mb-3 h-5 w-5 text-indigo-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Install on Android</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Open the live site in Chrome, tap the menu, then choose Install app or Add to Home screen.</p>
        </Card>
        <Card>
          <Smartphone className="mb-3 h-5 w-5 text-emerald-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Works like an app</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">The app gets its own home screen icon and opens outside the normal browser chrome.</p>
        </Card>
        <Card>
          <Bell className="mb-3 h-5 w-5 text-amber-500" />
          <div className="font-display text-sm font-semibold text-slate-900">Reminder engine next</div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Once push keys are configured, scheduled backend checks can send deadline and calendar reminders.</p>
        </Card>
      </div>

      <Card>
        <div className="mb-3 ff-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">This device</div>
        {!supported && <p className="text-sm text-rose-600">This browser does not support web push. Use Chrome on Android for the best result.</p>}
        {supported && !configured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            Add <span className="ff-mono">VITE_WEB_PUSH_PUBLIC_KEY</span> in Cloudflare Pages before enabling notifications.
          </div>
        )}
        {supported && configured && (
          <div className="flex flex-wrap items-center gap-2">
            {subscribed
              ? <button onClick={disable} disabled={busy} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Disable notifications</button>
              : <button onClick={enable} disabled={busy} className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">Enable notifications</button>}
          </div>
        )}
        {message && <p className="mt-3 text-xs text-slate-500">{message}</p>}
      </Card>
    </div>
  )
}
