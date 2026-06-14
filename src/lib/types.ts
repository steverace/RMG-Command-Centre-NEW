export const PROJECT_TYPES = ['client','personal','affiliate','directory','app','seo','content','automation','admin'] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const PROJECT_STATUSES = ['idea','not_started','active','paused','waiting','completed','abandoned'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PRIORITIES = ['low','medium','high','urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PAYMENT_STATUSES = ['not_applicable','not_invoiced','invoiced','part_paid','paid','overdue'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

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
  amount_charged: number | null
  amount_paid: number | null
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

export type ProjectMetrics = {
  project_id: string
  overall_progress: number | null
  launch_readiness: number | null
  delivery_readiness: number | null
  admin_completion: number | null
  outstanding_balance: number | null
  days_since_last_worked: number | null
  is_waiting: boolean
  is_stale: boolean
  has_no_next_action: boolean
  is_overdue: boolean
  health_score: number | null
}

export type ProjectWithMetrics = Project & { metrics: ProjectMetrics | null }

export function humanise(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
