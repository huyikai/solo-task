<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'DashboardView' })
import type { Task, TaskStatus } from '../types/task'
import { useTaskStats, getDeadlineDay } from '../composables/useTaskStats'
import { useBurndownSeries } from '../composables/useBurndownSeries'
import StatusPieChart from './StatusPieChart.vue'
import BurndownChart from './BurndownChart.vue'
import { CalendarClock, AlertTriangle, History } from 'lucide-vue-next'

const props = defineProps<{
  tasks: Task[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [task: Task]
}>()

const tasksRef = computed(() => props.tasks)
const {
  total,
  byStatus,
  scheduledCount,
  unscheduledCount,
  overdueCount,
  overdueTasks,
  dueSoonTasks,
  recentUpdated,
  tagTop,
} = useTaskStats(tasksRef)

const { series: burndownSeries, weekLabel, hasScopedTasks } = useBurndownSeries(tasksRef)

const statusMeta: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: '待办', color: 'var(--st-status-todo)' },
  { key: 'in-progress', label: '进行中', color: 'var(--st-status-progress)' },
  { key: 'done', label: '已完成', color: 'var(--st-status-done)' },
  { key: 'archived', label: '归档', color: 'var(--st-status-archived)' },
]

function formatDay(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function deadlineLabel(task: Task) {
  const d = getDeadlineDay(task)
  if (!d) return '—'
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <main class="flex-1 min-h-0 overflow-y-auto p-6">
    <div v-if="loading" class="flex items-center justify-center min-h-[200px]">
      <span class="text-[var(--st-text-secondary)] text-sm">加载中...</span>
    </div>

    <template v-else>
      <h1 class="text-lg font-semibold text-[var(--st-text-primary)] mb-4">总览</h1>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div
          v-for="item in [
            { label: '全部', value: total, sub: '' },
            { label: '待办', value: byStatus.todo, sub: '' },
            { label: '进行中', value: byStatus['in-progress'], sub: '' },
            { label: '已完成', value: byStatus.done, sub: '' },
            { label: '未排期', value: unscheduledCount, sub: '无截止时间' },
            { label: '逾期', value: overdueCount, sub: '待处理', warn: overdueCount > 0 },
          ]"
          :key="item.label"
          class="rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] px-4 py-3"
          :class="item.warn ? 'ring-1 ring-[var(--st-danger-ring)]' : ''"
        >
          <div class="text-xs font-medium text-[var(--st-text-secondary)] uppercase tracking-wide">
            {{ item.label }}
          </div>
          <div
            class="text-2xl font-semibold tabular-nums mt-1"
            :class="item.warn ? 'text-[var(--st-danger)]' : 'text-[var(--st-text-primary)]'"
          >
            {{ item.value }}
          </div>
          <div v-if="item.sub" class="text-xs text-[var(--st-text-muted)] mt-0.5">{{ item.sub }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] p-4 min-h-0">
          <h2 class="text-sm font-semibold text-[var(--st-text-primary)] mb-3">状态分布</h2>
          <StatusPieChart :by-status="byStatus" :status-meta="statusMeta" />
        </div>
        <div class="rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] p-4 min-h-0">
          <h2 class="text-sm font-semibold text-[var(--st-text-primary)] mb-3">本周燃尽</h2>
          <BurndownChart
            :series="burndownSeries"
            :week-label="weekLabel"
            :has-scoped-tasks="hasScopedTasks"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] overflow-hidden">
          <div
            class="flex items-center gap-2 px-4 py-2.5 bg-[var(--st-bg-danger-soft)] border-b border-[var(--st-border-danger-soft)]"
          >
            <AlertTriangle class="w-4 h-4 text-[var(--st-icon-on-danger-soft)]" />
            <h2 class="text-sm font-semibold text-[var(--st-text-primary)]">逾期</h2>
            <span class="text-xs text-[var(--st-text-secondary)]">（{{ overdueTasks.length }}）</span>
          </div>
          <div class="max-h-48 overflow-y-auto">
            <button
              v-for="t in overdueTasks"
              :key="t.id"
              type="button"
              class="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm border-b border-[var(--st-border-divider)] hover:bg-[var(--st-bg-hover)] min-w-0"
              @click="emit('edit', t)"
            >
              <span class="truncate text-[var(--st-text-primary)]">{{ t.title }}</span>
              <span class="text-xs text-[var(--st-danger)] shrink-0">截止 {{ deadlineLabel(t) }}</span>
            </button>
            <div
              v-if="overdueTasks.length === 0"
              class="px-4 py-8 text-center text-xs text-[var(--st-text-muted)]"
            >
              暂无逾期任务
            </div>
          </div>
        </div>

        <div class="rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] overflow-hidden">
          <div
            class="flex items-center gap-2 px-4 py-2.5 bg-[var(--st-bg-info-soft)] border-b border-[var(--st-border-info-soft)]"
          >
            <CalendarClock class="w-4 h-4 text-[var(--st-icon-info)]" />
            <h2 class="text-sm font-semibold text-[var(--st-text-primary)]">7 日内到期</h2>
            <span class="text-xs text-[var(--st-text-secondary)]">（{{ dueSoonTasks.length }}）</span>
          </div>
          <div class="max-h-48 overflow-y-auto">
            <button
              v-for="t in dueSoonTasks"
              :key="t.id"
              type="button"
              class="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm border-b border-[var(--st-border-divider)] hover:bg-[var(--st-bg-hover)] min-w-0"
              @click="emit('edit', t)"
            >
              <span class="truncate text-[var(--st-text-primary)]">{{ t.title }}</span>
              <span class="text-xs text-[var(--st-text-secondary)] shrink-0">{{ deadlineLabel(t) }}</span>
            </button>
            <div
              v-if="dueSoonTasks.length === 0"
              class="px-4 py-8 text-center text-xs text-[var(--st-text-muted)]"
            >
              暂无即将到期任务
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] overflow-hidden">
          <div
            class="flex items-center gap-2 px-4 py-2.5 bg-[var(--st-bg-neutral-soft)] border-b border-[var(--st-border)]"
          >
            <History class="w-4 h-4 text-[var(--st-text-secondary)]" />
            <h2 class="text-sm font-semibold text-[var(--st-text-primary)]">最近更新</h2>
          </div>
          <div class="divide-y divide-[var(--st-border-divider)]">
            <button
              v-for="t in recentUpdated"
              :key="t.id"
              type="button"
              class="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-[var(--st-bg-hover)] min-w-0"
              @click="emit('edit', t)"
            >
              <span class="truncate text-[var(--st-text-primary)]">{{ t.title }}</span>
              <span class="text-xs text-[var(--st-text-muted)] shrink-0">{{ formatDay(t.updatedAt) }}</span>
            </button>
            <div
              v-if="recentUpdated.length === 0"
              class="px-4 py-8 text-center text-xs text-[var(--st-text-muted)]"
            >
              暂无任务
            </div>
          </div>
        </div>

        <div class="rounded border border-[var(--st-border)] bg-[var(--st-bg-surface)] p-4">
          <h2 class="text-sm font-semibold text-[var(--st-text-primary)] mb-3">热门标签</h2>
          <div v-if="tagTop.length" class="flex flex-wrap gap-2">
            <span
              v-for="tag in tagTop"
              :key="tag.name"
              class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-sm bg-[var(--st-tag-0-bg)] text-[var(--st-tag-0-fg)]"
            >
              {{ tag.name }}
              <span class="text-[var(--st-text-secondary)]">{{ tag.count }}</span>
            </span>
          </div>
          <p v-else class="text-xs text-[var(--st-text-muted)]">暂无标签数据</p>
          <p class="text-xs text-[var(--st-text-muted)] mt-4">
            已排期任务：<span class="font-medium text-[var(--st-text-primary)]">{{ scheduledCount }}</span>
          </p>
        </div>
      </div>

      <p v-if="total === 0" class="mt-8 text-center text-sm text-[var(--st-text-muted)]">
        还没有任务，点击右上角「创建」开始。
      </p>
    </template>
  </main>
</template>
