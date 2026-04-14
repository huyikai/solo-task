<script setup lang="ts">
import { computed } from 'vue'
import type { Task, TaskStatus } from '../types/task'
import { useTaskStats, getDeadlineDay } from '../composables/useTaskStats'
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
  statusPercents,
} = useTaskStats(tasksRef)

const statusMeta: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: '待办', color: '#0052CC' },
  { key: 'in-progress', label: '进行中', color: '#FF991F' },
  { key: 'done', label: '已完成', color: '#00875A' },
  { key: 'archived', label: '归档', color: '#6B778C' },
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
    <div
      v-if="loading"
      class="flex items-center justify-center min-h-[200px]"
    >
      <span class="text-[#5E6C84] text-sm">加载中...</span>
    </div>

    <template v-else>
      <h1 class="text-lg font-semibold text-[#172B4D] mb-4">总览</h1>

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
          class="rounded border border-[#DFE1E6] bg-white px-4 py-3"
          :class="item.warn ? 'ring-1 ring-[#DE350B]/40' : ''"
        >
          <div class="text-xs font-medium text-[#5E6C84] uppercase tracking-wide">
            {{ item.label }}
          </div>
          <div
            class="text-2xl font-semibold tabular-nums mt-1"
            :class="item.warn ? 'text-[#DE350B]' : 'text-[#172B4D]'"
          >
            {{ item.value }}
          </div>
          <div v-if="item.sub" class="text-xs text-[#6B778C] mt-0.5">{{ item.sub }}</div>
        </div>
      </div>

      <div class="rounded border border-[#DFE1E6] bg-white p-4 mb-6">
        <h2 class="text-sm font-semibold text-[#172B4D] mb-3">状态分布</h2>
        <div class="flex h-8 rounded overflow-hidden border border-[#EBECF0]">
          <div
            v-for="sp in statusPercents.filter((s) => s.percent > 0)"
            :key="sp.status"
            class="h-full min-w-[2px] transition-all"
            :style="{
              width: `${sp.percent}%`,
              backgroundColor: statusMeta.find((m) => m.key === sp.status)?.color ?? '#DFE1E6',
            }"
            :title="`${statusMeta.find((m) => m.key === sp.status)?.label ?? sp.status} ${sp.percent}%`"
          />
        </div>
        <div class="flex flex-wrap gap-4 mt-3 text-xs text-[#5E6C84]">
          <span v-for="m in statusMeta" :key="m.key" class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-sm shrink-0" :style="{ backgroundColor: m.color }" />
            {{ m.label }} {{ byStatus[m.key] }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="rounded border border-[#DFE1E6] bg-white overflow-hidden">
          <div
            class="flex items-center gap-2 px-4 py-2.5 bg-[#FFEBE6] border-b border-[#FFBDAD]"
          >
            <AlertTriangle class="w-4 h-4 text-[#DE350B]" />
            <h2 class="text-sm font-semibold text-[#172B4D]">逾期</h2>
            <span class="text-xs text-[#5E6C84]">（{{ overdueTasks.length }}）</span>
          </div>
          <div class="max-h-48 overflow-y-auto">
            <button
              v-for="t in overdueTasks"
              :key="t.id"
              type="button"
              class="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm border-b border-[#F4F5F7] hover:bg-[#E4F0FF] min-w-0"
              @click="emit('edit', t)"
            >
              <span class="truncate text-[#172B4D]">{{ t.title }}</span>
              <span class="text-xs text-[#DE350B] shrink-0">截止 {{ deadlineLabel(t) }}</span>
            </button>
            <div
              v-if="overdueTasks.length === 0"
              class="px-4 py-8 text-center text-xs text-[#6B778C]"
            >
              暂无逾期任务
            </div>
          </div>
        </div>

        <div class="rounded border border-[#DFE1E6] bg-white overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-[#DEEBFF] border-b border-[#B3D4FF]">
            <CalendarClock class="w-4 h-4 text-[#0052CC]" />
            <h2 class="text-sm font-semibold text-[#172B4D]">7 日内到期</h2>
            <span class="text-xs text-[#5E6C84]">（{{ dueSoonTasks.length }}）</span>
          </div>
          <div class="max-h-48 overflow-y-auto">
            <button
              v-for="t in dueSoonTasks"
              :key="t.id"
              type="button"
              class="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm border-b border-[#F4F5F7] hover:bg-[#E4F0FF] min-w-0"
              @click="emit('edit', t)"
            >
              <span class="truncate text-[#172B4D]">{{ t.title }}</span>
              <span class="text-xs text-[#5E6C84] shrink-0">{{ deadlineLabel(t) }}</span>
            </button>
            <div
              v-if="dueSoonTasks.length === 0"
              class="px-4 py-8 text-center text-xs text-[#6B778C]"
            >
              暂无即将到期任务
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="rounded border border-[#DFE1E6] bg-white overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2.5 bg-[#EBECF0] border-b border-[#DFE1E6]">
            <History class="w-4 h-4 text-[#5E6C84]" />
            <h2 class="text-sm font-semibold text-[#172B4D]">最近更新</h2>
          </div>
          <div class="divide-y divide-[#F4F5F7]">
            <button
              v-for="t in recentUpdated"
              :key="t.id"
              type="button"
              class="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#E4F0FF] min-w-0"
              @click="emit('edit', t)"
            >
              <span class="truncate text-[#172B4D]">{{ t.title }}</span>
              <span class="text-xs text-[#6B778C] shrink-0">{{ formatDay(t.updatedAt) }}</span>
            </button>
            <div
              v-if="recentUpdated.length === 0"
              class="px-4 py-8 text-center text-xs text-[#6B778C]"
            >
              暂无任务
            </div>
          </div>
        </div>

        <div class="rounded border border-[#DFE1E6] bg-white p-4">
          <h2 class="text-sm font-semibold text-[#172B4D] mb-3">热门标签</h2>
          <div v-if="tagTop.length" class="flex flex-wrap gap-2">
            <span
              v-for="tag in tagTop"
              :key="tag.name"
              class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-sm bg-[#DEEBFF] text-[#0747A6]"
            >
              {{ tag.name }}
              <span class="text-[#5E6C84]">{{ tag.count }}</span>
            </span>
          </div>
          <p v-else class="text-xs text-[#6B778C]">暂无标签数据</p>
          <p class="text-xs text-[#6B778C] mt-4">
            已排期任务：<span class="font-medium text-[#172B4D]">{{ scheduledCount }}</span>
          </p>
        </div>
      </div>

      <p
        v-if="total === 0"
        class="mt-8 text-center text-sm text-[#6B778C]"
      >
        还没有任务，点击右上角「创建」开始。
      </p>
    </template>
  </main>
</template>
