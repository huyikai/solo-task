<script setup lang="ts">
import { ref, watch, nextTick, computed, type CSSProperties } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import type { Task } from '../types/task'
import {
  useGanttSchedule,
  type GanttZoom,
  type GanttViewportPreset,
  getTaskSchedule,
} from '../composables/useGanttSchedule'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'

defineOptions({ name: 'GanttView' })

/** 与 Tailwind w-64 一致，供滚动计算使用 */
const NAME_COL_W = 256

const props = defineProps<{
  tasks: Task[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [task: Task]
}>()

const zoom = ref<GanttZoom>('week')
const viewportPreset = ref<GanttViewportPreset>('eightWeeks')
const collapsedIds = ref<Set<string>>(new Set())
/** 自定义视窗起止（本地日历日）；仅在 preset === custom 时由 composable 使用 */
const customVisibleRange = ref<{ start: Date; end: Date } | null>(null)

const tasksRef = computed(() => props.tasks)
const {
  unscheduledTasks,
  timelineDays,
  todayColumnIndex,
  colWidthPx,
  timelineWidthPx,
  rows,
  visibleRange,
} = useGanttSchedule(tasksRef, zoom, viewportPreset, collapsedIds, customVisibleRange)

const ROW_H = 40

const unscheduledOpen = ref(true)

const headerScrollRef = ref<HTMLElement | null>(null)
const mainScrollRef = ref<HTMLElement | null>(null)

let syncing = false

function onMainScroll() {
  const m = mainScrollRef.value
  const h = headerScrollRef.value
  if (!m || !h || syncing) return
  syncing = true
  h.scrollLeft = m.scrollLeft
  syncing = false
}

function onHeaderScroll() {
  const m = mainScrollRef.value
  const h = headerScrollRef.value
  if (!m || !h || syncing) return
  syncing = true
  m.scrollLeft = h.scrollLeft
  syncing = false
}

watch([zoom, () => props.tasks, viewportPreset, customVisibleRange], () => {
  nextTick(() => {
    if (headerScrollRef.value && mainScrollRef.value) {
      headerScrollRef.value.scrollLeft = mainScrollRef.value.scrollLeft
    }
  })
})

function localTodayDate(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

function toInputDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYMD(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, mo, da] = s.split('-').map(Number)
  const dt = new Date(y, mo - 1, da)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== da) return null
  return dt
}

const customStartStr = ref('')
const customEndStr = ref('')

function addDaysLocal(d: Date, n: number): Date {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  t.setDate(t.getDate() + n)
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

function syncCustomVisibleFromStrings() {
  const a = parseYMD(customStartStr.value)
  const b = parseYMD(customEndStr.value)
  if (!a || !b) return
  if (a.getTime() <= b.getTime()) {
    customVisibleRange.value = { start: a, end: b }
  } else {
    customVisibleRange.value = { start: b, end: a }
  }
}

function seedCustomStringsFromEightWeeks() {
  const t = localTodayDate()
  customStartStr.value = toInputDateStr(t)
  customEndStr.value = toInputDateStr(addDaysLocal(t, 8 * 7 - 1))
  syncCustomVisibleFromStrings()
}

watch(
  () => viewportPreset.value,
  p => {
    if (p !== 'custom') return
    if (!customStartStr.value || !customEndStr.value) {
      seedCustomStringsFromEightWeeks()
    } else {
      syncCustomVisibleFromStrings()
    }
  }
)

watch([customStartStr, customEndStr], () => {
  if (viewportPreset.value === 'custom') {
    syncCustomVisibleFromStrings()
  }
})

const rowCount = computed(() => rows.value.length)

const virtualizerRef = useVirtualizer(
  computed(() => ({
    count: rowCount.value,
    getScrollElement: () => mainScrollRef.value,
    estimateSize: () => ROW_H,
    overscan: 12,
  }))
)

const virtualItems = computed(() => virtualizerRef.value.getVirtualItems())
const totalSize = computed(() => virtualizerRef.value.getTotalSize())

watch(rowCount, () => {
  nextTick(() => {
    virtualizerRef.value.measure()
  })
})

function formatDayLabel(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function isWeekend(d: Date) {
  const w = d.getDay()
  return w === 0 || w === 6
}

function isTodayColumn(di: number) {
  return todayColumnIndex.value !== null && todayColumnIndex.value === di
}

const barBg: Record<Task['priority'], string> = {
  urgent: 'bg-[var(--st-gantt-urgent)]',
  high: 'bg-[var(--st-gantt-high)]',
  medium: 'bg-[var(--st-gantt-medium)]',
  low: 'bg-[var(--st-gantt-low)]',
}

const barBgDone = 'bg-[var(--st-gantt-done)]'

function barClass(task: Task) {
  return task.status === 'done' || task.status === 'archived' ? barBgDone : barBg[task.priority] ?? barBg.medium
}

function tooltipText(task: Task) {
  const s = getTaskSchedule(task)
  if (!s) return task.title
  const a = s.start.toLocaleDateString()
  const b = s.end.toLocaleDateString()
  const range = s.kind === 'due' ? `截止 ${b}（单日）` : `${a} – ${b}（含首尾日）`
  return `${task.title}\n${range}\n${task.status} · ${task.priority}`
}

const ganttBodyTimelineBgStyle = computed((): CSSProperties => {
  const days = timelineDays.value
  const n = days.length
  const cw = colWidthPx.value
  const tw = timelineWidthPx.value
  const h = totalSize.value
  if (n === 0 || tw <= 0) {
    return {}
  }
  const tIdx = todayColumnIndex.value
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const p0 = (i / n) * 100
    const p1 = ((i + 1) / n) * 100
    let fill = 'transparent'
    if (tIdx !== null && i === tIdx) {
      fill = 'color-mix(in srgb, var(--st-accent-soft) 60%, transparent)'
    } else if (isWeekend(days[i])) {
      fill = 'var(--st-bg-weekend)'
    }
    parts.push(`${fill} ${p0}%`, `${fill} ${p1}%`)
  }
  const fillGrad = `linear-gradient(to right, ${parts.join(', ')})`
  const gridGrad = `repeating-linear-gradient(to right, var(--st-border-subtle) 0, var(--st-border-subtle) 1px, transparent 1px, transparent ${cw}px)`
  return {
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${tw}px`,
    height: `${h}px`,
    pointerEvents: 'none',
    zIndex: 0,
    backgroundImage: `${gridGrad}, ${fillGrad}`,
    backgroundSize: '100% 100%, 100% 100%',
  }
})

function formatVisibleRangeText() {
  const { start, end } = visibleRange.value
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`
}

function scrollToToday() {
  const el = mainScrollRef.value
  const idx = todayColumnIndex.value
  if (!el || idx === null) return
  const colW = colWidthPx.value
  const target = NAME_COL_W + idx * colW - el.clientWidth / 2 + colW / 2
  el.scrollLeft = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth))
}

const canScrollToToday = computed(
  () => todayColumnIndex.value !== null && rowCount.value > 0
)

const childCountByParent = computed(() => {
  const m = new Map<string, number>()
  for (const t of props.tasks) {
    if (t.parentId) {
      m.set(t.parentId, (m.get(t.parentId) ?? 0) + 1)
    }
  }
  return m
})

function hasChildren(id: string) {
  return (childCountByParent.value.get(id) ?? 0) > 0
}

function isCollapsed(id: string) {
  return collapsedIds.value.has(id)
}

function toggleCollapse(taskId: string, e: MouseEvent) {
  e.stopPropagation()
  const next = new Set(collapsedIds.value)
  if (next.has(taskId)) next.delete(taskId)
  else next.add(taskId)
  collapsedIds.value = next
}

function selectCustomPreset() {
  viewportPreset.value = 'custom'
  if (!customStartStr.value || !customEndStr.value) {
    seedCustomStringsFromEightWeeks()
  } else {
    syncCustomVisibleFromStrings()
  }
}

function presetClass(p: GanttViewportPreset) {
  return viewportPreset.value === p
    ? 'bg-[var(--st-accent-soft)] text-[var(--st-accent)]'
    : 'hover:bg-[var(--st-bg-muted-strong)] text-[var(--st-text-primary)]'
}

function zoomClass(z: GanttZoom) {
  return zoom.value === z
    ? 'bg-[var(--st-accent-soft)] text-[var(--st-accent)]'
    : 'hover:bg-[var(--st-bg-muted-strong)] text-[var(--st-text-primary)]'
}
</script>

<template>
  <main class="flex-1 flex flex-col min-h-0 p-6 pt-4 overflow-hidden">
    <div v-if="loading" class="flex items-center justify-center flex-1">
      <span class="text-[var(--st-text-secondary)] text-sm">加载中...</span>
    </div>

    <template v-else>
      <div class="flex flex-col gap-2 shrink-0 mb-3">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[var(--st-text-secondary)]">
          <span class="font-medium text-[var(--st-text-primary)]">甘特图</span>
          <span class="text-[var(--st-border)] hidden sm:inline">|</span>
          <div class="flex flex-wrap items-center gap-1">
            <span class="text-xs text-[var(--st-text-muted)] mr-1">视窗</span>
            <button
              type="button"
              class="px-2 py-1 rounded-sm transition-colors text-xs sm:text-sm"
              :class="presetClass('thisMonth')"
              @click="viewportPreset = 'thisMonth'"
            >
              本月
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded-sm transition-colors text-xs sm:text-sm"
              :class="presetClass('eightWeeks')"
              @click="viewportPreset = 'eightWeeks'"
            >
              未来 8 周
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded-sm transition-colors text-xs sm:text-sm"
              :class="presetClass('all')"
              @click="viewportPreset = 'all'"
            >
              全部
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded-sm transition-colors text-xs sm:text-sm"
              :class="presetClass('custom')"
              @click="selectCustomPreset"
            >
              自定义
            </button>
          </div>
          <span class="text-[var(--st-border)] hidden md:inline">|</span>
          <div class="flex flex-wrap items-center gap-1">
            <span class="text-xs text-[var(--st-text-muted)] mr-1">列宽</span>
            <button
              type="button"
              class="px-2 py-1 rounded-sm transition-colors text-xs sm:text-sm"
              :class="zoomClass('week')"
              @click="zoom = 'week'"
            >
              周视图
            </button>
            <button
              type="button"
              class="px-2 py-1 rounded-sm transition-colors text-xs sm:text-sm"
              :class="zoomClass('month')"
              @click="zoom = 'month'"
            >
              月视图
            </button>
          </div>
          <span class="text-[var(--st-border)] hidden md:inline">|</span>
          <button
            type="button"
            class="px-2 py-1 rounded-sm transition-colors text-xs sm:text-sm border border-[var(--st-border)] disabled:opacity-40 disabled:pointer-events-none"
            :disabled="!canScrollToToday"
            title="横向滚动到今天所在列（若今天不在当前视窗内请先切换视窗）"
            @click="scrollToToday"
          >
            今天
          </button>
        </div>
        <p class="text-xs text-[var(--st-text-muted)] tabular-nums">
          当前范围：{{ formatVisibleRangeText() }}
          <span class="block sm:inline sm:before:content-['\00a0'] mt-1 sm:mt-0 text-[var(--st-text-muted)]">
            任务列表仅含排期与该范围有交集的任务（父任务仅在为展示子任务时保留）。
          </span>
        </p>
        <div
          v-if="viewportPreset === 'custom'"
          class="flex flex-wrap items-center gap-2 text-xs text-[var(--st-text-secondary)]"
        >
          <label class="flex items-center gap-1.5">
            <span class="text-[var(--st-text-muted)] shrink-0">从</span>
            <input
              v-model="customStartStr"
              type="date"
              class="rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] px-2 py-1 text-[var(--st-text-primary)] tabular-nums"
            />
          </label>
          <label class="flex items-center gap-1.5">
            <span class="text-[var(--st-text-muted)] shrink-0">到</span>
            <input
              v-model="customEndStr"
              type="date"
              class="rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] px-2 py-1 text-[var(--st-text-primary)] tabular-nums"
            />
          </label>
        </div>
      </div>

      <div
        class="flex flex-col flex-1 min-h-0 rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] overflow-hidden"
      >
        <div class="flex shrink-0 border-b border-[var(--st-border)] bg-[var(--st-bg-header-row)]">
          <div
            class="w-64 shrink-0 px-3 py-2 text-xs font-semibold text-[var(--st-text-secondary)] uppercase border-r border-[var(--st-border)] flex items-center"
          >
            任务
          </div>
          <div
            ref="headerScrollRef"
            class="flex-1 overflow-x-auto overflow-y-hidden min-w-0"
            @scroll="onHeaderScroll"
          >
            <div class="flex h-10" :style="{ width: `${timelineWidthPx}px` }">
              <div
                v-for="(day, i) in timelineDays"
                :key="i"
                class="shrink-0 flex items-center justify-center gap-0.5 text-xs border-l border-[var(--st-border-subtle)]"
                :class="
                  isTodayColumn(i)
                    ? 'bg-[var(--st-accent-soft)] text-[var(--st-accent)] font-medium border-l-2 border-l-[var(--st-accent)]'
                    : 'text-[var(--st-text-secondary)] ' +
                      (isWeekend(day) ? 'bg-[var(--st-bg-weekend)]' : '')
                "
                :style="{ width: `${colWidthPx}px` }"
              >
                <template v-if="isTodayColumn(i)">
                  <div
                    v-if="zoom === 'month'"
                    class="flex flex-col items-center justify-center gap-0 px-0.5 min-w-0 text-center leading-none"
                  >
                    <span class="text-[11px] tabular-nums whitespace-nowrap">{{
                      formatDayLabel(day)
                    }}</span>
                    <span class="text-[9px] font-semibold mt-0.5">今</span>
                  </div>
                  <div v-else class="flex items-center justify-center gap-0.5 min-w-0">
                    <span class="tabular-nums whitespace-nowrap">{{ formatDayLabel(day) }}</span>
                    <span class="text-[10px] font-semibold shrink-0">今</span>
                  </div>
                </template>
                <span v-else>{{ formatDayLabel(day) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="rows.length === 0"
          class="flex flex-1 min-h-[12rem] items-center justify-center bg-[var(--st-bg-header-row)] text-xs text-[var(--st-text-muted)]"
        >
          暂无已排期任务
        </div>
        <div
          v-else
          ref="mainScrollRef"
          class="flex-1 overflow-auto min-h-0 bg-[var(--st-bg-header-row)]"
          @scroll="onMainScroll"
        >
          <div
            class="flex flex-row min-w-0"
            :style="{
              minHeight: `${totalSize}px`,
              minWidth: `${NAME_COL_W + timelineWidthPx}px`,
            }"
          >
            <div
              class="sticky left-0 z-[4] w-64 shrink-0 self-start relative border-r border-[var(--st-border)] bg-[var(--st-bg-surface)] shadow-[4px_0_12px_-6px_rgba(0,0,0,0.12)]"
              :style="{ minHeight: `${totalSize}px` }"
            >
              <div
                v-for="vi in virtualItems"
                :key="'n' + vi.index"
                class="absolute left-0 right-0 flex items-center border-b border-[var(--st-border-subtle)] cursor-pointer hover:bg-[var(--st-bg-hover)] text-sm text-[var(--st-text-primary)] min-w-0 pr-2"
                :style="{
                  top: `${vi.start}px`,
                  height: `${vi.size}px`,
                  paddingLeft: `${8 + rows[vi.index]!.depth * 14}px`,
                }"
                @click="emit('edit', rows[vi.index]!.task)"
              >
                <button
                  v-if="hasChildren(rows[vi.index]!.task.id)"
                  type="button"
                  class="shrink-0 mr-1 p-0.5 rounded hover:bg-[var(--st-bg-muted-strong)] text-[var(--st-text-secondary)]"
                  :aria-expanded="!isCollapsed(rows[vi.index]!.task.id)"
                  @click="toggleCollapse(rows[vi.index]!.task.id, $event)"
                >
                  <ChevronDown v-if="!isCollapsed(rows[vi.index]!.task.id)" class="w-4 h-4" />
                  <ChevronRight v-else class="w-4 h-4" />
                </button>
                <span v-else class="w-5 shrink-0 mr-1" aria-hidden="true" />
                <span class="truncate min-w-0">{{ rows[vi.index]!.task.title }}</span>
              </div>
            </div>

            <div
              class="relative shrink-0 bg-[var(--st-bg-header-row)]"
              :style="{ width: `${timelineWidthPx}px`, minHeight: `${totalSize}px` }"
            >
              <div aria-hidden="true" :style="ganttBodyTimelineBgStyle" />
              <div
                v-for="vi in virtualItems"
                :key="'b' + vi.index"
                class="absolute left-0 right-0 z-[1] border-b border-[var(--st-border-subtle)]"
                :style="{
                  top: `${vi.start}px`,
                  height: `${vi.size}px`,
                }"
                @click="emit('edit', rows[vi.index]!.task)"
              >
                <div
                  v-if="rows[vi.index]!.bar"
                  class="absolute top-2 bottom-2 rounded-sm pointer-events-auto cursor-pointer shadow-sm min-w-[4px]"
                  :class="barClass(rows[vi.index]!.task)"
                  :style="{
                    left: `${rows[vi.index]!.bar!.leftPx}px`,
                    width: `${Math.max(rows[vi.index]!.bar!.widthPx, 4)}px`,
                  }"
                  :title="tooltipText(rows[vi.index]!.task)"
                  @click.stop="emit('edit', rows[vi.index]!.task)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="shrink-0 mt-3 border border-[var(--st-border)] rounded bg-[var(--st-bg-surface)] overflow-hidden"
      >
        <button
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[var(--st-text-primary)] bg-[var(--st-bg-muted-strong)] hover:bg-[var(--st-bg-hover-row)] transition-colors"
          @click="unscheduledOpen = !unscheduledOpen"
        >
          <component
            :is="unscheduledOpen ? ChevronDown : ChevronRight"
            class="w-4 h-4 text-[var(--st-text-secondary)]"
          />
          未排期
          <span class="text-xs font-normal text-[var(--st-text-secondary)]"
            >（{{ unscheduledTasks.length }}）</span
          >
        </button>
        <div v-if="unscheduledOpen" class="max-h-36 overflow-y-auto border-t border-[var(--st-border)]">
          <button
            v-for="t in unscheduledTasks"
            :key="t.id"
            type="button"
            class="w-full text-left px-3 py-2 text-sm text-[var(--st-text-primary)] hover:bg-[var(--st-bg-hover)] border-b border-[var(--st-border-divider)] last:border-0 truncate"
            @click="emit('edit', t)"
          >
            {{ t.title }}
          </button>
          <div
            v-if="unscheduledTasks.length === 0"
            class="px-3 py-4 text-center text-xs text-[var(--st-text-muted)]"
          >
            没有未排期任务
          </div>
        </div>
      </div>
    </template>
  </main>
</template>
