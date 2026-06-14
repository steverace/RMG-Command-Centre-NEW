import {
  LayoutDashboard, FolderKanban, ListChecks, Lightbulb,
  Users, PoundSterling, CalendarCheck, Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  short: string
  icon: LucideIcon
  primary?: boolean // shown in mobile bottom bar
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Control Deck', short: 'Deck', icon: LayoutDashboard, primary: true },
  { to: '/projects', label: 'Projects', short: 'Projects', icon: FolderKanban, primary: true },
  { to: '/tasks', label: 'Tasks', short: 'Tasks', icon: ListChecks, primary: true },
  { to: '/ideas', label: 'Ideas', short: 'Ideas', icon: Lightbulb, primary: true },
  { to: '/clients', label: 'Clients', short: 'Clients', icon: Users },
  { to: '/money', label: 'Money', short: 'Money', icon: PoundSterling, primary: true },
  { to: '/review', label: 'Weekly Review', short: 'Review', icon: CalendarCheck },
]

export const settingsItem: NavItem = {
  to: '/settings', label: 'Settings', short: 'Settings', icon: Settings,
}
