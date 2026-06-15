export const PROJECT_TYPES = ['client','personal','affiliate','directory','app','seo','content','automation','admin'] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const PROJECT_STATUSES = ['idea','not_started','active','paused','waiting','completed','abandoned'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export const SELECTABLE_PROJECT_STATUSES = PROJECT_STATUSES.filter((s) => s !== 'idea')

export const PRIORITIES = ['low','medium','high','urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PAYMENT_STATUSES = ['not_applicable','not_invoiced','invoiced','part_paid','paid','overdue'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const ITEM_STATUSES = ['not_started','in_progress','blocked','complete'] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]

export const TASK_ENERGIES = ['quick','deep_work','admin','annoying','client_chasing'] as const
export type TaskEnergy = (typeof TASK_ENERGIES)[number]

export const WAITING_ON_TYPES = ['client_feedback','payment','supplier','indexing','third_party_approval','other'] as const
export type WaitingOnType = (typeof WAITING_ON_TYPES)[number]

export const RECURRING_CATEGORIES = ['hosting','domain','seo_retainer','affiliate','directory','other_recurring'] as const
export type RecurringCategory = (typeof RECURRING_CATEGORIES)[number]

export const BILLING_CYCLES = ['monthly','quarterly','annual','one_off'] as const
export type BillingCycle = (typeof BILLING_CYCLES)[number]

export const QUOTE_STATUSES = ['to_send','sent','accepted','declined','expired'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export type Project = {
  id: string
  name: string
  type: ProjectType
  status: ProjectStatus
  client_id: string | null
  priority: Priority
  start_date: string | null
  due_date: string | null
  last_worked_on: string | null
  project_value: number | null
  amount_charged: number
  amount_paid: number
  payment_status: PaymentStatus
  payment_due_date: string | null
  next_action: string | null
  blockers: string | null
  ai_can_help: boolean
  manual_required: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ChecklistItem = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: ItemStatus
  required_for_completion: boolean
  gate_launch: boolean
  gate_delivery: boolean
  weight: number
  can_be_done_by_ai: boolean
  requires_manual: boolean
  due_date: string | null
  completed_at: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ProjectMetrics = {
  project_id: string
  overall_progress: number | null
  launch_readiness: number | null
  delivery_readiness: number | null
  admin_completion: number | null
  ai_remaining: number
  manual_remaining: number
  required_incomplete: number
  definition_of_done_met: boolean
  outstanding_balance: number | null
  days_open: number | null
  days_since_last_worked: number | null
  is_waiting: boolean
  waiting_days: number | null
  is_stale: boolean
  has_no_next_action: boolean
  is_overdue: boolean
  health_score: number | null
}

export type ProjectWithMetrics = Project & { metrics: ProjectMetrics | null }

export type Task = {
  id: string
  title: string
  project_id: string | null
  client_id: string | null
  status: ItemStatus
  priority: Priority
  due_date: string | null
  energy: TaskEnergy | null
  can_be_done_by_ai: boolean
  requires_manual: boolean
  blocked: boolean
  notes: string | null
  waiting_on_type: WaitingOnType | null
  waiting_on_person: string | null
  waiting_since: string | null
  avoidance_level: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SecureRef = { label: string; location: string }

export type Client = {
  id: string
  name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  notes: string | null
  secure_refs: SecureRef[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type RecurringRevenue = {
  id: string
  label: string
  category: RecurringCategory
  amount: number
  billing_cycle: BillingCycle
  next_due_date: string | null
  active: boolean
  project_id: string | null
  client_id: string | null
  started_on: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Quote = {
  id: string
  client_id: string | null
  title: string
  prospect_name: string | null
  amount: number | null
  status: QuoteStatus
  sent_on: string | null
  follow_up_date: string | null
  notes: string | null
  converted_project_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function humanise(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function clientDisplayName(c: { business_name: string | null; name: string | null }): string {
  return (c.business_name?.trim() || c.name?.trim() || 'Unnamed client')
}

export function monthlyEquivalent(r: { amount: number; billing_cycle: BillingCycle }): number {
  switch (r.billing_cycle) {
    case 'monthly': return r.amount
    case 'quarterly': return r.amount / 3
    case 'annual': return r.amount / 12
    default: return 0
  }
}

export const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
