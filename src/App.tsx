import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/AppShell'
import EmptyState from '@/components/EmptyState'
import { navItems, settingsItem } from '@/lib/nav'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import Login from '@/auth/Login'
import Dashboard from '@/features/dashboard/Dashboard'
import ProjectsPage from '@/features/projects/ProjectsPage'
import ProjectDetail from '@/features/projects/ProjectDetail'
import TasksPage from '@/features/tasks/TasksPage'
import ClientsPage from '@/features/clients/ClientsPage'
import ClientDetail from '@/features/clients/ClientDetail'
import MoneyPage from '@/features/money/MoneyPage'
import QuotesPage from '@/features/quotes/QuotesPage'

const messages: Record<string, string> = {
  '/ideas': 'The opportunity-ranked idea store arrives next.',
  '/review': 'The weekly review screen arrives soon.',
  '/settings': 'Thresholds, account, Obsidian vault and data export arrive soon.',
}

const BUILT = ['/', '/projects', '/tasks', '/clients', '/money', '/quotes']

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

  const placeholders = [...navItems, settingsItem].filter((n) => !BUILT.includes(n.to))
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/money" element={<MoneyPage />} />
        <Route path="/quotes" element={<QuotesPage />} />
        {placeholders.map((n) => (
          <Route key={n.to} path={n.to} element={<EmptyState icon={n.icon} title={n.label} note={messages[n.to] ?? 'Coming soon.'} />} />
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
