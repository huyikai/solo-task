/**
 * 甘特图时间映射规范（与产品约定一致）：
 *
 * | 数据形态 | 甘特展示 |
 * |----------|----------|
 * | startDate + endDate 均有 | 条形 [start, end]，结束日按「含当日」闭区间 |
 * | 仅 dueDate | 单日宽条（截止日当天 00:00–次日 00:00 本地） |
 * | 三者皆空 | 不进入时间轴，归入「未排期」 |
 * | 仅 start 或仅 end | 视为不完整，归入「未排期」 |
 *
 * 条形在轨道上的定位按「从可见范围起点起算的整日索引」计算，避免夏令时导致的非整点误差。
 */

import { computed, type Ref } from 'vue'
import type { Task } from '../types/task'

export type GanttZoom = 'week' | 'month'

/** 单日列宽（px），zoom 切换疏密 */
export const ZOOM_COL_WIDTH: Record<GanttZoom, number> = {
  week: 44,
  month: 28,
}

const DAY_MS = 86400000

function parseDay(iso: string): Date {
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

function daysBetweenInclusive(start: Date, end: Date): number {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((b - a) / DAY_MS) + 1
}

export type ScheduleKind = 'range' | 'due'

export interface TaskSchedule {
  kind: ScheduleKind
  /** 含当日，本地日历日 */
  start: Date
  /** 含当日，本地日历日 */
  end: Date
}

/** 从任务解析出可绘制区间；无法解析则 null */
export function getTaskSchedule(task: Task): TaskSchedule | null {
  if (task.startDate && task.endDate) {
    const start = parseDay(task.startDate)
    const end = parseDay(task.endDate)
    if (end.getTime() < start.getTime()) return null
    return { kind: 'range', start, end }
  }
  if (task.dueDate && !task.startDate && !task.endDate) {
    const day = parseDay(task.dueDate)
    return { kind: 'due', start: day, end: day }
  }
  return null
}

export interface GanttBar {
  leftPx: number
  widthPx: number
  kind: ScheduleKind
}

export interface GanttRow {
  task: Task
  depth: number
  schedule: TaskSchedule | null
  bar: GanttBar | null
}

function collectAncestorIds(tasks: Task[], taskId: string): Set<string> {
  const byId = new Map(tasks.map(t => [t.id, t]))
  const ids = new Set<string>()
  let cur: Task | undefined = byId.get(taskId)
  while (cur?.parentId) {
    ids.add(cur.parentId)
    cur = byId.get(cur.parentId)
  }
  return ids
}

function topLevelTasks(tasks: Task[]): Task[] {
  const ids = new Set(tasks.map(t => t.id))
  return tasks.filter(
    t => !t.parentId || t.parentId === t.id || !ids.has(t.parentId)
  )
}

function buildRowOrder(tasks: Task[], rowIds: Set<string>): Task[] {
  const byParent = new Map<string | null, Task[]>()
  for (const t of tasks) {
    const p = t.parentId
    if (!byParent.has(p)) byParent.set(p, [])
    byParent.get(p)!.push(t)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  const out: Task[] = []
  const seen = new Set<string>()

  function walk(parentId: string | null) {
    const children = byParent.get(parentId) ?? []
    for (const t of children) {
      if (!rowIds.has(t.id) || seen.has(t.id)) continue
      seen.add(t.id)
      out.push(t)
      walk(t.id)
    }
  }

  for (const root of topLevelTasks(tasks)) {
    if (!rowIds.has(root.id) || seen.has(root.id)) continue
    seen.add(root.id)
    out.push(root)
    walk(root.id)
  }

  for (const id of rowIds) {
    if (seen.has(id)) continue
    const t = tasks.find(x => x.id === id)
    if (t) {
      seen.add(id)
      out.push(t)
    }
  }
  return out
}

export function useGanttSchedule(
  tasks: Ref<Task[]>,
  zoom: Ref<GanttZoom>
) {
  const scheduledTasks = computed(() =>
    tasks.value.filter(t => getTaskSchedule(t) !== null)
  )

  const unscheduledTasks = computed(() =>
    tasks.value.filter(t => getTaskSchedule(t) === null)
  )

  const visibleRange = computed(() => {
    const schedules = scheduledTasks.value
      .map(t => getTaskSchedule(t))
      .filter((s): s is TaskSchedule => s !== null)
    const today = parseDay(new Date().toISOString())

    if (schedules.length === 0) {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start, end }
    }

    let minS = schedules[0].start
    let maxE = schedules[0].end
    for (const s of schedules) {
      if (s.start.getTime() < minS.getTime()) minS = s.start
      if (s.end.getTime() > maxE.getTime()) maxE = s.end
    }
    return {
      start: addDays(minS, -7),
      end: addDays(maxE, 7),
    }
  })

  const totalDays = computed(() =>
    daysBetweenInclusive(visibleRange.value.start, visibleRange.value.end)
  )

  const timelineDays = computed(() => {
    const { start, end } = visibleRange.value
    const days: Date[] = []
    let d = new Date(start)
    while (d.getTime() <= end.getTime()) {
      days.push(new Date(d))
      d = addDays(d, 1)
    }
    return days
  })

  const colWidthPx = computed(() => ZOOM_COL_WIDTH[zoom.value])
  const timelineWidthPx = computed(() => totalDays.value * colWidthPx.value)

  const rows = computed((): GanttRow[] => {
    const list = tasks.value
    const scheduledIds = new Set(scheduledTasks.value.map(t => t.id))
    const rowIds = new Set<string>(scheduledIds)
    for (const id of scheduledIds) {
      for (const aid of collectAncestorIds(list, id)) {
        rowIds.add(aid)
      }
    }

    const ordered = buildRowOrder(list, rowIds)
    const rangeStart = visibleRange.value.start
    const rangeEnd = visibleRange.value.end
    const cw = colWidthPx.value
    const total = totalDays.value

    function depthOf(task: Task): number {
      let d = 0
      let cur: Task | undefined = task
      const byId = new Map(list.map(t => [t.id, t]))
      while (cur?.parentId) {
        d++
        cur = byId.get(cur.parentId)
        if (d > 50) break
      }
      return d
    }

    function barFor(sched: TaskSchedule | null): GanttBar | null {
      if (!sched) return null
      const rs = rangeStart.getTime()
      const clipStart =
        sched.start.getTime() < rs ? rangeStart : sched.start
      const re = rangeEnd.getTime()
      const clipEnd = sched.end.getTime() > re ? rangeEnd : sched.end
      if (clipEnd.getTime() < rs || clipStart.getTime() > re) return null

      const idx0 = Math.floor((clipStart.getTime() - rs) / DAY_MS)
      const idx1 = Math.floor((clipEnd.getTime() - rs) / DAY_MS)
      const daySpan = idx1 - idx0 + 1
      const leftPx = idx0 * cw
      const widthPx = daySpan * cw
      return { leftPx, widthPx, kind: sched.kind }
    }

    return ordered.map(task => {
      const sched = getTaskSchedule(task)
      return {
        task,
        depth: depthOf(task),
        schedule: sched,
        bar: barFor(sched),
      }
    })
  })

  return {
    scheduledTasks,
    unscheduledTasks,
    visibleRange,
    totalDays,
    timelineDays,
    colWidthPx,
    timelineWidthPx,
    rows,
  }
}
