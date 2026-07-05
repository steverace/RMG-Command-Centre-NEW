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
import IdeasPage from '@/features/ideas/IdeasPage'
import GoalsHabitsPage from '@/features/goals/GoalsHabitsPage'
import WeeklyReview from '@/features/review/WeeklyReview'
import SettingsPage from '@/features/settings/SettingsPage'
import VoiceAgentPage from '@/features/voice/VoiceAgentPage'
import CalendarPage from '@/features/calendar/CalendarPage'
import AIAccessPage from '@/features/integrations/AIAccessPage'
import NotificationsPage from '@/features/notifications/NotificationsPage'

const BUILT = ['/', '/projects', '/tasks', '/clients', '/money', '/quotes', '/ideas', '/goals', '/calendar', '/notifications', '/voice', '/ai-access', '/review', '/settings']

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
        <Route path="/ideas" element={<IdeasPage />} />
        <Route path="/goals" element={<GoalsHabitsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/voice" element={<VoiceAgentPage />} />
        <Route path="/ai-access" element={<AIAccessPage />} />
        <Route path="/review" element={<WeeklyReview />} />
        <Route path="/settings" element={<SettingsPage />} />
        {placeholders.map((n) => (
          <Route key={n.to} path={n.to} element={<EmptyState icon={n.icon} title={n.label} note="Coming soon." />} />
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
