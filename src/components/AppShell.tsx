import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Plus, LogOut, Menu, X } from 'lucide-react'
import { navItems, settingsItem } from '@/lib/nav'
import { useAuth } from '@/auth/AuthProvider'

function currentTitle(pathname: string): string {
  const all = [...navItems, settingsItem]
  const match = all.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))
  return match?.label ?? 'Control Deck'
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <div className="leading-tight">
        <div className="font-display text-[11px] font-semibold tracking-[0.18em] text-slate-400">RACE MEDIA</div>
        <div className="font-display text-sm font-bold tracking-wide text-slate-100">CONTROL CENTRE</div>
      </div>
    </div>
  )
}

function SideLink({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: typeof Plus; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        ['group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'].join(' ')
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="font-medium">{label}</span>
    </NavLink>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { session, signOut } = useAuth()
  const [drawer, setDrawer] = useState(false)
  const title = currentTitle(pathname)
  const email = session?.user?.email ?? ''
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 md:flex">
        <Brand />
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((n) => <SideLink key={n.to} to={n.to} label={n.label} icon={n.icon} />)}
        </nav>
        <div className="border-t border-slate-800 px-3 py-3">
          <SideLink to={settingsItem.to} label={settingsItem.label} icon={settingsItem.icon} />
          <div className="mt-2 flex items-center justify-between gap-2 px-3 py-1.5">
            <span className="truncate text-[11px] text-slate-500">{email}</span>
            <button onClick={() => void signOut()} className="text-slate-500 transition-colors hover:text-slate-200" aria-label="Sign out" title="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button onClick={() => setDrawer(false)} className="text-slate-400" aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-3">
              {navItems.map((n) => <SideLink key={n.to} to={n.to} label={n.label} icon={n.icon} onClick={() => setDrawer(false)} />)}
            </nav>
            <div className="border-t border-slate-800 px-3 py-3">
              <SideLink to={settingsItem.to} label={settingsItem.label} icon={settingsItem.icon} onClick={() => setDrawer(false)} />
              <button onClick={() => void signOut()} className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800/50"><LogOut className="h-4 w-4" /> Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between bg-slate-900 px-3 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setDrawer(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300" aria-label="Menu"><Menu className="h-5 w-5" /></button>
            <span className="font-display text-sm font-bold tracking-wide text-slate-100">{title}</span>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-white" aria-label="Quick add"><Plus className="h-5 w-5" /></button>
        </header>

        {/* Desktop top bar */}
        <header className="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-4 md:flex">
          <div>
            <h1 className="font-display text-lg font-semibold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-400">{today}</p>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"><Plus className="h-4 w-4" /> Quick add</button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">{children}</main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-10 flex items-stretch justify-around border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
          {navItems.filter((n) => n.primary).map((n) => {
            const Icon = n.icon
            return (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}
                className={({ isActive }) => ['flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium', isActive ? 'text-slate-900' : 'text-slate-400'].join(' ')}>
                <Icon className="h-5 w-5" />
                {n.short}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
