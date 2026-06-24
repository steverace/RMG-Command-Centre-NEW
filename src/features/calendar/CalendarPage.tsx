import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ExternalLink, RefreshCw } from 'lucide-react'

type CalendarEvent = {
  id: string
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  location?: string
}

type GoogleTokenClient = {
  callback: (response: { access_token?: string; error?: string }) => void
  requestAccessToken: (options: { prompt: string }) => void
}

declare global {
  interface Window {
    gapi?: {
      load: (name: string, callback: () => void) => void
      client: {
        init: (config: { apiKey: string; discoveryDocs: string[] }) => Promise<void>
        setToken: (token: { access_token: string } | '') => void
        getToken: () => { access_token: string } | null
        calendar: {
          events: {
            list: (request: Record<string, unknown>) => Promise<{ result: { items?: CalendarEvent[] } }>
          }
        }
      }
    }
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: { client_id: string; scope: string; callback: GoogleTokenClient['callback'] }) => GoogleTokenClient
          revoke: (token: string) => void
        }
      }
    }
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID as string | undefined
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY as string | undefined
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

function script(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.defer = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Could not load ${src}`))
    document.head.appendChild(el)
  })
}

function formatDate(value?: string) {
  if (!value) return 'No date'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function CalendarPage() {
  const configured = !!CLIENT_ID && !!API_KEY
  const [ready, setReady] = useState(false)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tokenClient, setTokenClient] = useState<GoogleTokenClient | null>(null)

  useEffect(() => {
    if (!configured) return
    let mounted = true
    async function loadGoogle() {
      try {
        await Promise.all([
          script('https://apis.google.com/js/api.js'),
          script('https://accounts.google.com/gsi/client'),
        ])
        await new Promise<void>((resolve) => window.gapi?.load('client', resolve))
        await window.gapi?.client.init({ apiKey: API_KEY!, discoveryDocs: [DISCOVERY_DOC] })
        const client = window.google?.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID!,
          scope: SCOPES,
          callback: () => undefined,
        })
        if (mounted && client) {
          setTokenClient(client)
          setReady(true)
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Google Calendar could not be loaded')
      }
    }
    void loadGoogle()
    return () => { mounted = false }
  }, [configured])

  async function listEvents() {
    setBusy(true)
    setError(null)
    try {
      const response = await window.gapi?.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 10,
        orderBy: 'startTime',
      })
      setEvents(response?.result.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load calendar events')
    } finally {
      setBusy(false)
    }
  }

  function connect() {
    if (!tokenClient) return
    setBusy(true)
    setError(null)
    tokenClient.callback = async (response) => {
      if (response.error || !response.access_token) {
        setBusy(false)
        setError(response.error ?? 'Google did not return an access token')
        return
      }
      window.gapi?.client.setToken({ access_token: response.access_token })
      setConnected(true)
      await listEvents()
    }
    tokenClient.requestAccessToken({ prompt: window.gapi?.client.getToken() ? '' : 'consent' })
  }

  function disconnect() {
    const token = window.gapi?.client.getToken()
    if (token?.access_token) window.google?.accounts.oauth2.revoke(token.access_token)
    window.gapi?.client.setToken('')
    setConnected(false)
    setEvents([])
  }

  const setupOrigin = useMemo(() => window.location.origin, [])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">Google Calendar</h2>
                <p className="text-xs text-slate-400">Upcoming diary context for the Command Centre</p>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              This connects your browser session to Google Calendar using read-only access first. Once that is stable, reminders and event creation can be added safely.
            </p>
          </div>
          {configured && (
            <div className="flex gap-2">
              {connected
                ? <button onClick={disconnect} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Disconnect</button>
                : <button onClick={connect} disabled={!ready || busy} className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">Connect Google</button>}
              <button onClick={() => void listEvents()} disabled={!connected || busy} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      {!configured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-display text-sm font-semibold text-amber-900">Calendar is ready for credentials</h3>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Add these in Cloudflare Pages environment variables, then redeploy:
          </p>
          <div className="mt-3 rounded-lg bg-white/70 p-3 ff-mono text-xs text-amber-900">
            VITE_GOOGLE_CALENDAR_CLIENT_ID<br />
            VITE_GOOGLE_CALENDAR_API_KEY
          </div>
          <p className="mt-3 text-xs leading-5 text-amber-800">
            In Google Cloud, enable the Calendar API, create a Web application OAuth client, and add <span className="ff-mono">{setupOrigin}</span> as an authorised JavaScript origin.
          </p>
          <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-900 hover:underline" href="https://developers.google.com/workspace/calendar/api/quickstart/js" target="_blank" rel="noreferrer">
            Google Calendar setup guide <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 ff-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Upcoming events</div>
        {!connected && configured && <p className="text-sm text-slate-400">Connect Google Calendar to load upcoming events.</p>}
        {connected && events.length === 0 && !busy && <p className="text-sm text-slate-400">No upcoming events found.</p>}
        {busy && <p className="text-sm text-slate-400">Loading calendar...</p>}
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
              <div className="text-sm font-medium text-slate-800">{event.summary ?? 'Untitled event'}</div>
              <div className="mt-0.5 text-xs text-slate-400">{formatDate(event.start?.dateTime ?? event.start?.date)}</div>
              {event.location && <div className="mt-1 text-xs text-slate-500">{event.location}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
