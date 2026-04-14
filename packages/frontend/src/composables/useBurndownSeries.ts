/**
 * 本周燃尽（本地自然周：周一至周日）
 *
 * - 范围：截止日期落在本周内的任务（与 Dashboard 的 getDeadlineDay 一致）。
 * - 每日剩余：在当日结束时仍未完成的任务数；已完成任务用 updatedAt 的本地日期作为完成日。
 * - 新建任务：createdAt 晚于某日则不计入该日及之前的剩余。
 * - 理想线：从「本周开始前一日结束时」的剩余量线性降至周日结束时为 0。
 */

import { computed, type Ref } from 'vue'
import type { Task } from '../types/task'
import { getDeadlineDay } from './useTaskStats'

const DAY_MS = 86400000

function parseLocalDay(iso: string): Date {
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const dow = d.getDay() // 0 Sun .. 6 Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  return new Date(d.getTime() + mondayOffset * DAY_MS)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function dayTime(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function isTerminalStatus(s: Task['status']): boolean {
  return s === 'done' || s === 'archived'
}

function completionDay(task: Task): Date | null {
  if (!isTerminalStatus(task.status)) return null
  return parseLocalDay(task.updatedAt)
}

/** 截止日是否落在 [weekStart, weekEnd] 闭区间（本地日历日） */
function deadlineInWeek(task: Task, weekStart: Date, weekEnd: Date): boolean {
  const dl = getDeadlineDay(task)
  if (!dl) return false
  const t0 = dayTime(weekStart)
  const t1 = dayTime(weekEnd)
  const td = dayTime(dl)
  return td >= t0 && td <= t1
}

/** 在「某日结束时」仍未完成、且应计入本周燃尽的任务是否仍算剩余 */
function isRemainingAtEndOfDay(task: Task, endOfDay: Date): boolean {
  const created = parseLocalDay(task.createdAt)
  if (dayTime(created) > dayTime(endOfDay)) return false
  if (!isTerminalStatus(task.status)) return true
  const cd = completionDay(task)!
  return dayTime(cd) > dayTime(endOfDay)
}

export interface BurndownDayPoint {
  /** 0=周一 … 6=周日 */
  index: number
  label: string
  ideal: number
  /** 已过日期有值；未到之日为 null */
  actual: number | null
}

export function useBurndownSeries(tasks: Ref<Task[]>) {
  const weekRange = computed(() => {
    const today = new Date()
    const monday = startOfWeekMonday(today)
    const sunday = addDays(monday, 6)
    return { weekStart: monday, weekEnd: sunday }
  })

  const scopedTasks = computed(() => {
    const { weekStart, weekEnd } = weekRange.value
    return tasks.value.filter(t => deadlineInWeek(t, weekStart, weekEnd))
  })

  const dayBeforeWeek = computed(() => addDays(weekRange.value.weekStart, -1))

  const todayIndex = computed(() => {
    const monday = weekRange.value.weekStart
    const t0 = dayTime(monday)
    const tToday = dayTime(new Date())
    if (tToday < t0) return -1
    const idx = Math.round((tToday - t0) / DAY_MS)
    return Math.min(6, Math.max(0, idx))
  })

  const initialBacklog = computed(() => {
    const endPrev = dayBeforeWeek.value
    let n = 0
    for (const t of scopedTasks.value) {
      if (isRemainingAtEndOfDay(t, endPrev)) n++
    }
    return n
  })

  const series = computed((): BurndownDayPoint[] => {
    const { weekStart } = weekRange.value
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const tIdx = todayIndex.value
    const ideal0 = initialBacklog.value
    const out: BurndownDayPoint[] = []

    for (let i = 0; i < 7; i++) {
      const endOfDay = addDays(weekStart, i)
      let rem = 0
      for (const t of scopedTasks.value) {
        if (isRemainingAtEndOfDay(t, endOfDay)) rem++
      }
      const ideal = ideal0 * (1 - (i + 1) / 7)
      const actual = tIdx < 0 ? null : i <= tIdx ? rem : null
      out.push({
        index: i,
        label: labels[i]!,
        ideal: Math.max(0, ideal),
        actual,
      })
    }
    return out
  })

  const weekLabel = computed(() => {
    const a = weekRange.value.weekStart
    const b = weekRange.value.weekEnd
    return `${a.getMonth() + 1}/${a.getDate()}–${b.getMonth() + 1}/${b.getDate()}`
  })

  const hasScopedTasks = computed(() => scopedTasks.value.length > 0)

  return {
    weekRange,
    weekLabel,
    scopedTasks,
    initialBacklog,
    series,
    todayIndex,
    hasScopedTasks,
  }
}
