<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { Task } from '../types/task'
import {
  useGanttSchedule,
  type GanttZoom,
  getTaskSchedule,
} from '../composables/useGanttSchedule'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  tasks: Task[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [task: Task]
}>()

const zoom = ref<GanttZoom>('week')
const tasksRef = computed(() => props.tasks)
const {
  unscheduledTasks,
  timelineDays,
  colWidthPx,
  timelineWidthPx,
  rows,
} = useGanttSchedule(tasksRef, zoom)

const ROW_H = 40

const unscheduledOpen = ref(true)

const headerScrollRef = ref<HTMLElement | null>(null)
const bodyScrollRef = ref<HTMLElement | null>(null)
const namesScrollRef = ref<HTMLElement | null>(null)

let syncing = false

function onBodyScroll() {
  const b = bodyScrollRef.value
  const h = headerScrollRef.value
  const n = namesScrollRef.value
  if (!b || !h || !n || syncing) return
  syncing = true
  h.scrollLeft = b.scrollLeft
  n.scrollTop = b.scrollTop
  syncing = false
}

function onNamesScroll() {
  const b = bodyScrollRef.value
  const n = namesScrollRef.value
  if (!b || !n || syncing) return
  syncing = true
  b.scrollTop = n.scrollTop
  syncing = false
}

function onHeaderScroll() {
  const b = bodyScrollRef.value
  const h = headerScrollRef.value
  if (!b || !h || syncing) return
  syncing = true
  b.scrollLeft = h.scrollLeft
  syncing = false
}

watch([zoom, () => props.tasks], () => {
  nextTick(() => {
    headerScrollRef.value && bodyScrollRef.value &&
      (headerScrollRef.value!.scrollLeft = bodyScrollRef.value!.scrollLeft)
  })
})

function formatDayLabel(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function isWeekend(d: Date) {
  const w = d.getDay()
  return w === 0 || w === 6
}

const barBg: Record<Task['priority'], string> = {
  urgent: 'bg-[#DE350B]',
  high: 'bg-[#FF991F]',
  medium: 'bg-[#0065FF]',
  low: 'bg-[#6B778C]',
}

const barBgDone = 'bg-[#00875A]/70'

function barClass(task: Task) {
  return task.status === 'done' || task.status === 'archived'
    ? barBgDone
    : barBg[task.priority] ?? barBg.medium
}

function tooltipText(task: Task) {
  const s = getTaskSchedule(task)
  if (!s) return task.title
  const a = s.start.toLocaleDateString()
  const b = s.end.toLocaleDateString()
  const range =
    s.kind === 'due'
      ? `截止 ${b}（单日）`
      : `${a} – ${b}（含首尾日）`
  return `${task.title}\n${range}\n${task.status} · ${task.priority}`
}
</script>

<template>
  <main class="flex-1 flex flex-col min-h-0 p-6 pt-4 overflow-hidden">
    <div
      v-if="loading"
      class="flex items-center justify-center flex-1"
    >
      <span class="text-[#5E6C84] text-sm">加载中...</span>
    </div>

    <template v-else>
      <div class="flex items-center justify-between shrink-0 mb-3">
        <div class="flex items-center gap-2 text-sm text-[#5E6C84]">
          <span class="font-medium text-[#172B4D]">甘特图</span>
          <span class="text-[#DFE1E6]">|</span>
          <button
            type="button"
            class="px-2 py-1 rounded-sm transition-colors"
            :class="zoom === 'week' ? 'bg-[#DEEBFF] text-[#0052CC]' : 'hover:bg-[#EBECF0] text-[#172B4D]'"
            @click="zoom = 'week'"
          >
            周视图
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded-sm transition-colors"
            :class="zoom === 'month' ? 'bg-[#DEEBFF] text-[#0052CC]' : 'hover:bg-[#EBECF0] text-[#172B4D]'"
            @click="zoom = 'month'"
          >
            月视图
          </button>
        </div>
      </div>

      <div class="flex flex-col flex-1 min-h-0 rounded border border-[#DFE1E6] bg-white overflow-hidden">
        <div class="flex shrink-0 border-b border-[#DFE1E6] bg-[#FAFBFC]">
          <div
            class="w-64 shrink-0 px-3 py-2 text-xs font-semibold text-[#5E6C84] uppercase border-r border-[#DFE1E6] flex items-center"
          >
            任务
          </div>
          <div
            ref="headerScrollRef"
            class="flex-1 overflow-x-auto overflow-y-hidden min-w-0"
            @scroll="onHeaderScroll"
          >
            <div
              class="flex h-10"
              :style="{ width: `${timelineWidthPx}px` }"
            >
              <div
                v-for="(day, i) in timelineDays"
                :key="i"
                class="shrink-0 flex items-center justify-center text-xs text-[#5E6C84] border-l border-[#EBECF0]"
                :class="isWeekend(day) ? 'bg-[#F4F5F7]' : ''"
                :style="{ width: `${colWidthPx}px` }"
              >
                {{ formatDayLabel(day) }}
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-1 min-h-0">
          <div
            ref="namesScrollRef"
            class="w-64 shrink-0 overflow-y-auto overflow-x-hidden border-r border-[#DFE1E6] bg-white"
            @scroll="onNamesScroll"
          >
            <div
              v-for="row in rows"
              :key="row.task.id"
              class="flex items-center px-2 border-b border-[#EBECF0] cursor-pointer hover:bg-[#E4F0FF] text-sm text-[#172B4D] min-w-0"
              :style="{ height: `${ROW_H}px` }"
              @click="emit('edit', row.task)"
            >
              <span
                class="truncate"
                :style="{ paddingLeft: `${8 + row.depth * 14}px` }"
              >{{ row.task.title }}</span>
            </div>
            <div
              v-if="rows.length === 0"
              class="p-6 text-center text-xs text-[#6B778C]"
            >
              暂无已排期任务
            </div>
          </div>

          <div
            ref="bodyScrollRef"
            class="flex-1 overflow-auto min-w-0 bg-[#FAFBFC]"
            @scroll="onBodyScroll"
          >
            <div
              class="relative"
              :style="{ width: `${timelineWidthPx}px` }"
            >
              <div
                v-for="row in rows"
                :key="row.task.id"
                class="border-b border-[#EBECF0] relative"
                :style="{ height: `${ROW_H}px` }"
                @click="emit('edit', row.task)"
              >
                <div
                  class="absolute inset-0 flex pointer-events-none"
                >
                  <div
                    v-for="(day, di) in timelineDays"
                    :key="di"
                    class="shrink-0 border-l border-[#EBECF0]/80"
                    :class="isWeekend(day) ? 'bg-[#F4F5F7]/80' : ''"
                    :style="{ width: `${colWidthPx}px` }"
                  />
                </div>
                <div
                  v-if="row.bar"
                  class="absolute top-2 bottom-2 rounded-sm pointer-events-auto cursor-pointer shadow-sm min-w-[4px]"
                  :class="barClass(row.task)"
                  :style="{
                    left: `${row.bar.leftPx}px`,
                    width: `${Math.max(row.bar.widthPx, 4)}px`,
                  }"
                  :title="tooltipText(row.task)"
                  @click.stop="emit('edit', row.task)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="shrink-0 mt-3 border border-[#DFE1E6] rounded bg-white overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm font-medium text-[#172B4D] bg-[#EBECF0] hover:bg-[#DFE1E6] transition-colors"
          @click="unscheduledOpen = !unscheduledOpen"
        >
          <component
            :is="unscheduledOpen ? ChevronDown : ChevronRight"
            class="w-4 h-4 text-[#5E6C84]"
          />
          未排期
          <span class="text-xs font-normal text-[#5E6C84]">（{{ unscheduledTasks.length }}）</span>
        </button>
        <div
          v-if="unscheduledOpen"
          class="max-h-36 overflow-y-auto border-t border-[#DFE1E6]"
        >
          <button
            v-for="t in unscheduledTasks"
            :key="t.id"
            type="button"
            class="w-full text-left px-3 py-2 text-sm text-[#172B4D] hover:bg-[#E4F0FF] border-b border-[#F4F5F7] last:border-0 truncate"
            @click="emit('edit', t)"
          >
            {{ t.title }}
          </button>
          <div
            v-if="unscheduledTasks.length === 0"
            class="px-3 py-4 text-center text-xs text-[#6B778C]"
          >
            没有未排期任务
          </div>
        </div>
      </div>
    </template>
  </main>
</template>
