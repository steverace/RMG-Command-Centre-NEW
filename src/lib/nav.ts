import {
  LayoutDashboard, FolderKanban, ListChecks, Lightbulb,
  Users, PoundSterling, FileText, CalendarCheck, Settings, Bot, CalendarDays, Plug, Bell, Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  short: string
  icon: LucideIcon
  primary?: boolean
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Control Deck', short: 'Deck', icon: LayoutDashboard, primary: true },
  { to: '/projects', label: 'Projects', short: 'Projects', icon: FolderKanban, primary: true },
  { to: '/tasks', label: 'Tasks', short: 'Tasks', icon: ListChecks, primary: true },
  { to: '/ideas', label: 'Ideas', short: 'Ideas', icon: Lightbulb },
  { to: '/goals', label: 'Goals & Habits', short: 'Goals', icon: Target },
  { to: '/clients', label: 'Clients', short: 'Clients', icon: Users },
  { to: '/money', label: 'Money', short: 'Money', icon: PoundSterling, primary: true },
  { to: '/quotes', label: 'Quotes', short: 'Quotes', icon: FileText, primary: true },
  { to: '/calendar', label: 'Calendar', short: 'Calendar', icon: CalendarDays },
  { to: '/notifications', label: 'Notifications', short: 'Alerts', icon: Bell },
  { to: '/voice', label: 'Voice Agent', short: 'Voice', icon: Bot },
  { to: '/ai-access', label: 'AI Access', short: 'AI', icon: Plug },
  { to: '/review', label: 'Weekly Review', short: 'Review', icon: CalendarCheck },
]

export const settingsItem: NavItem = {
  to: '/settings', label: 'Settings', short: 'Settings', icon: Settings,
}
