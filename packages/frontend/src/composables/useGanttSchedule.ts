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

/** 时间轴视窗：缩小默认横向滚动范围；「全部」沿用数据 min/max±7；「自定义」见 customVisibleRange */
export type GanttViewportPreset = 'thisMonth' | 'eightWeeks' | 'all' | 'custom'

const DAY_MS = 86400000

function parseDay(iso: string): Date {
  const d = new Date(iso)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

/** 本地日历的当天 00:00 */
function localToday(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
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

function collectAncestorIds(byId: Map<string, Task>, taskId: string): Set<string> {
  const ids = new Set<string>()
  let cur: Task | undefined = byId.get(taskId)
  while (cur?.parentId) {
    ids.add(cur.parentId)
    cur = byId.get(cur.parentId)
  }
  return ids
}

function depthOf(task: Task, byId: Map<string, Task>): number {
  let d = 0
  let cur: Task | undefined = task
  while (cur?.parentId) {
    d++
    cur = byId.get(cur.parentId)
    if (d > 50) break
  }
  return d
}

function topLevelTasks(tasks: Task[]): Task[] {
  const ids = new Set(tasks.map(t => t.id))
  return tasks.filter(
    t => !t.parentId || t.parentId === t.id || !ids.has(t.parentId)
  )
}

function buildRowOrder(
  tasks: Task[],
  rowIds: Set<string>,
  byId: Map<string, Task>
): Task[] {
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
    const t = byId.get(id)
    if (t) {
      seen.add(id)
      out.push(t)
    }
  }
  return out
}

/** 某任务是否因祖先被折叠而隐藏（collapsedIds 为被折叠的父节点 id） */
function isRowVisibleUnderCollapse(
  task: Task,
  byId: Map<string, Task>,
  collapsedIds: Set<string>
): boolean {
  let pid: string | null | undefined = task.parentId
  while (pid) {
    if (collapsedIds.has(pid)) return false
    const p = byId.get(pid)
    pid = p?.parentId ?? null
  }
  return true
}

function dataExtentFromSchedules(schedules: TaskSchedule[]): {
  minS: Date
  maxE: Date
} | null {
  if (schedules.length === 0) return null
  let minS = schedules[0].start
  let maxE = schedules[0].end
  for (const s of schedules) {
    if (s.start.getTime() < minS.getTime()) minS = s.start
    if (s.end.getTime() > maxE.getTime()) maxE = s.end
  }
  return { minS, maxE }
}

/** 排期区间与视窗 [rangeStart, rangeEnd]（含首尾日）是否有交集 */
export function scheduleIntersectsRange(
  sched: TaskSchedule,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  const rs = rangeStart.getTime()
  const re = rangeEnd.getTime()
  return sched.end.getTime() >= rs && sched.start.getTime() <= re
}

export function useGanttSchedule(
  tasks: Ref<Task[]>,
  zoom: Ref<GanttZoom>,
  viewportPreset: Ref<GanttViewportPreset>,
  collapsedIds: Ref<Set<string>>,
  customVisibleRange: Ref<{ start: Date; end: Date } | null>
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
    const today = localToday()

    const emptyMonthFallback = () => ({
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    })

    const preset = viewportPreset.value

    if (preset === 'custom') {
      const c = customVisibleRange.value
      if (c) {
        const a = new Date(c.start.getFullYear(), c.start.getMonth(), c.start.getDate())
        const b = new Date(c.end.getFullYear(), c.end.getMonth(), c.end.getDate())
        if (a.getTime() <= b.getTime()) {
          return { start: a, end: b }
        }
        return { start: b, end: a }
      }
      const start = new Date(today)
      const end = addDays(today, 8 * 7 - 1)
      return { start, end }
    }

    if (preset === 'thisMonth') {
      return emptyMonthFallback()
    }

    if (preset === 'eightWeeks') {
      const start = new Date(today)
      const end = addDays(today, 8 * 7 - 1)
      return { start, end }
    }

    // preset === 'all'
    if (schedules.length === 0) {
      return emptyMonthFallback()
    }

    const ext = dataExtentFromSchedules(schedules)
    if (!ext) return emptyMonthFallback()
    return {
      start: addDays(ext.minS, -7),
      end: addDays(ext.maxE, 7),
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

  const todayColumnIndex = computed((): number | null => {
    const t = localToday()
    const ty = t.getFullYear()
    const tm = t.getMonth()
    const td = t.getDate()
    const days = timelineDays.value
    const i = days.findIndex(
      d =>
        d.getFullYear() === ty &&
        d.getMonth() === tm &&
        d.getDate() === td
    )
    return i >= 0 ? i : null
  })

  const colWidthPx = computed(() => ZOOM_COL_WIDTH[zoom.value])
  const timelineWidthPx = computed(() => totalDays.value * colWidthPx.value)

  const rows = computed((): GanttRow[] => {
    const list = tasks.value
    const byId = new Map(list.map(t => [t.id, t]))
    const rangeStart = visibleRange.value.start
    const rangeEnd = visibleRange.value.end
    const scheduledIds = new Set<string>()
    for (const t of scheduledTasks.value) {
      const sched = getTaskSchedule(t)
      if (!sched) continue
      if (scheduleIntersectsRange(sched, rangeStart, rangeEnd)) {
        scheduledIds.add(t.id)
      }
    }
    const rowIds = new Set<string>(scheduledIds)
    for (const id of scheduledIds) {
      for (const aid of collectAncestorIds(byId, id)) {
        rowIds.add(aid)
      }
    }

    let ordered = buildRowOrder(list, rowIds, byId)
    const collapsed = collapsedIds.value
    if (collapsed.size > 0) {
      ordered = ordered.filter(t =>
        isRowVisibleUnderCollapse(t, byId, collapsed)
      )
    }
    const cw = colWidthPx.value

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
        depth: depthOf(task, byId),
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
    todayColumnIndex,
    colWidthPx,
    timelineWidthPx,
    rows,
  }
}
