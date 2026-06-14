import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/AppShell'
import EmptyState from '@/components/EmptyState'
import { navItems, settingsItem } from '@/lib/nav'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import Login from '@/auth/Login'

const messages: Record<string, string> = {
  '/': 'Your daily command view is being built. Soon this shows your Top 3, the five action signals, money owed and recurring revenue.',
  '/projects': 'Projects, checklists and the calculated progress engine arrive next.',
  '/tasks': 'Standalone and project tasks, with AI-ready, manual, waiting and avoided queues, arrive soon.',
  '/ideas': 'The opportunity-ranked idea store arrives soon.',
  '/clients': 'Client records, linked projects and secure reference fields arrive soon.',
  '/money': 'Money owed, outstanding invoices and recurring revenue arrive soon.',
  '/review': 'The weekly review screen arrives soon.',
  '/settings': 'Thresholds, account, Obsidian vault and data export arrive soon.',
}

function Loader() {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-950">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
      </span>
    </div>
  )
}

function Guarded() {
  const { session, loading } = useAuth()
  if (loading) return <Loader />
  if (!session) return <Login />

  const all = [...navItems, settingsItem]
  return (
    <AppShell>
      <Routes>
        {all.map((n) => (
          <Route
            key={n.to}
            path={n.to}
            element={<EmptyState icon={n.icon} title={n.label} note={messages[n.to] ?? 'Coming soon.'} />}
          />
        ))}
        <Route path="*" element={<EmptyState icon={navItems[0].icon} title="Not found" note="That screen does not exist yet." />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Guarded />
    </AuthProvider>
  )
}
