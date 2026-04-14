/**
 * Dashboard 聚合统计口径
 *
 * - 已排期 / 未排期：与甘特一致，使用 getTaskSchedule()。
 * - 截止日期：仅 due 用 due 当日；区间用 endDate 当日；无排期则无截止。
 * - 逾期：状态为 todo 或 in-progress，且截止日早于「今天 0 点」（本地日历）。
 * - 7 日内到期：状态为 todo 或 in-progress，截止日在今天～今天+7 日（含首尾，本地日历）。
 */

import { computed, type Ref } from 'vue'
import type { Task, TaskPriority, TaskStatus } from '../types/task'
import { getTaskSchedule } from './useGanttSchedule'

const DAY_MS = 86400000

function parseToday(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

/** 用于逾期/临期的「截止日」；无则 null */
export function getDeadlineDay(task: Task): Date | null {
  const s = getTaskSchedule(task)
  if (!s) return null
  return s.kind === 'due' ? s.end : s.end
}

function isActive(task: Task): boolean {
  return task.status === 'todo' || task.status === 'in-progress'
}

const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done', 'archived']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low']

export function useTaskStats(tasks: Ref<Task[]>) {
  const total = computed(() => tasks.value.length)

  const byStatus = computed(() => {
    const m = Object.fromEntries(STATUSES.map(s => [s, 0])) as Record<TaskStatus, number>
    for (const t of tasks.value) {
      m[t.status]++
    }
    return m
  })

  const byPriority = computed(() => {
    const m = Object.fromEntries(PRIORITIES.map(p => [p, 0])) as Record<TaskPriority, number>
    for (const t of tasks.value) {
      m[t.priority]++
    }
    return m
  })

  const scheduledCount = computed(
    () => tasks.value.filter(t => getTaskSchedule(t) !== null).length
  )

  const unscheduledCount = computed(
    () => tasks.value.filter(t => getTaskSchedule(t) === null).length
  )

  const overdueTasks = computed(() => {
    const today = parseToday().getTime()
    const list: Task[] = []
    for (const t of tasks.value) {
      if (!isActive(t)) continue
      const d = getDeadlineDay(t)
      if (!d) continue
      if (d.getTime() < today) list.push(t)
    }
    list.sort((a, b) => {
      const da = getDeadlineDay(a)!.getTime()
      const db = getDeadlineDay(b)!.getTime()
      return da - db
    })
    return list
  })

  const dueSoonTasks = computed(() => {
    const today = parseToday()
    const end = addDays(today, 7)
    const t0 = today.getTime()
    const t1 = end.getTime()
    const list: Task[] = []
    for (const t of tasks.value) {
      if (!isActive(t)) continue
      const d = getDeadlineDay(t)
      if (!d) continue
      const x = d.getTime()
      if (x >= t0 && x <= t1) list.push(t)
    }
    list.sort((a, b) => {
      const da = getDeadlineDay(a)!.getTime()
      const db = getDeadlineDay(b)!.getTime()
      return da - db
    })
    return list
  })

  const overdueCount = computed(() => overdueTasks.value.length)

  const recentUpdated = computed((): Task[] => {
    const list = tasks.value
    const k = 8
    if (list.length <= k) {
      return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }
    const heap: Task[] = []
    for (const t of list) {
      if (heap.length < k) {
        heap.push(t)
        continue
      }
      let minIdx = 0
      for (let i = 1; i < k; i++) {
        if (heap[i].updatedAt.localeCompare(heap[minIdx].updatedAt) < 0) minIdx = i
      }
      if (t.updatedAt.localeCompare(heap[minIdx].updatedAt) > 0) {
        heap[minIdx] = t
      }
    }
    heap.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return heap
  })

  const tagTop = computed(() => {
    const counts = new Map<string, number>()
    for (const t of tasks.value) {
      for (const tag of t.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  })

  const statusPercents = computed(() => {
    const n = total.value
    if (n === 0) {
      return STATUSES.map(s => ({ status: s, percent: 0 }))
    }
    return STATUSES.map(s => ({
      status: s,
      percent: Math.round((byStatus.value[s] / n) * 1000) / 10,
    }))
  })

  return {
    total,
    byStatus,
    byPriority,
    scheduledCount,
    unscheduledCount,
    overdueTasks,
    dueSoonTasks,
    overdueCount,
    recentUpdated,
    tagTop,
    statusPercents,
  }
}
