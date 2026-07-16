import type { Task } from '@/lib/types'

const todayStr = () => new Date().toISOString().slice(0, 10)

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export const isIncomplete = (t: Task) => t.status !== 'complete'
export const taskOverdue = (t: Task) => !!t.due_date && t.due_date < todayStr() && isIncomplete(t)
export const taskWaiting = (t: Task) => isIncomplete(t) && t.waiting_on_type !== null
export const taskAiReady = (t: Task) => t.can_be_done_by_ai && !t.requires_manual && isIncomplete(t) && !t.blocked && !taskWaiting(t)
export const taskManual = (t: Task) => t.requires_manual && isIncomplete(t) && !taskWaiting(t)
export const taskAvoided = (t: Task) => (t.avoidance_level ?? 0) >= 4 && isIncomplete(t) && daysSince(t.updated_at) > 7
export const recentlyCompleted = (t: Task) => t.status === 'complete' && !!t.completed_at && daysSince(t.completed_at) <= 7
export const taskNeedsSteveInput = (t: Task) => isIncomplete(t) && t.blocked && t.waiting_on_person?.toLowerCase() === 'steve'
export const taskSteveReview = (t: Task) => t.status === 'complete' && t.can_be_done_by_ai && t.requires_manual
