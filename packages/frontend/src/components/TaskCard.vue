<script setup lang="ts">
import type { Task } from '../types/task'
import TagBadge from './TagBadge.vue'
import TaskTree from './TaskTree.vue'
import {
  ArrowUpFromDot,
  ArrowUp,
  Minus,
  ArrowDown,
  Calendar,
  CalendarRange,
  Trash2,
} from 'lucide-vue-next'

const props = defineProps<{
  task: Task
  allTasks: Task[]
  /** 看板列内：整卡可拖（配合列上 Sortable delay / filter） */
  kanban?: boolean
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  'status-change': [id: string, status: Task['status']]
}>()

/** 低饱和、偏亮的粉彩色，区别于高饱和警示色 */
const priorityConfig: Record<string, { icon: any; color: string; label: string }> = {
  urgent: { icon: ArrowUpFromDot, color: 'text-[var(--st-priority-urgent)]', label: '紧急' },
  high: { icon: ArrowUp, color: 'text-[var(--st-priority-high)]', label: '高' },
  medium: { icon: Minus, color: 'text-[var(--st-priority-medium)]', label: '中' },
  low: { icon: ArrowDown, color: 'text-[var(--st-priority-low)]', label: '低' },
}

const priorityBorder: Record<string, string> = {
  urgent: 'border-l-[var(--st-priority-urgent)]',
  high: 'border-l-[var(--st-priority-high)]',
  medium: 'border-l-[var(--st-priority-medium)]',
  low: 'border-l-[var(--st-priority-low)]',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getChildren(): Task[] {
  return props.allTasks.filter(t => t.parentId === props.task.id)
}
</script>

<template>
  <div
    class="bg-[var(--st-bg-surface)] rounded border-l-[3px] transition-colors group relative"
    :class="[
      priorityBorder[task.priority],
      kanban
        ? 'cursor-grab select-none border border-[var(--st-border-muted)] shadow-[var(--st-shadow-kanban)] active:cursor-grabbing hover:bg-[var(--st-bg-surface)]'
        : 'cursor-pointer border border-[var(--st-border)] hover:bg-[var(--st-bg-hover-neutral)]',
    ]"
    @click="emit('edit', task)"
  >
    <button
      type="button"
      class="kanban-no-drag absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--st-bg-delete-hover)] text-[var(--st-text-muted)] hover:text-[var(--st-bg-delete-icon-hover)] transition-all z-[1]"
      @click.stop="emit('delete', task.id)"
    >
      <Trash2 class="w-3.5 h-3.5" />
    </button>

    <div class="p-3 min-w-0 pr-10">
      <h4 class="text-sm font-medium text-[var(--st-text-primary)] leading-5">{{ task.title }}</h4>

      <div class="flex flex-wrap items-center gap-1.5 mt-2">
        <div
          class="flex items-center gap-0.5 text-xs"
          :class="priorityConfig[task.priority]?.color"
          :title="priorityConfig[task.priority]?.label"
        >
          <component :is="priorityConfig[task.priority]?.icon" class="w-3.5 h-3.5" />
        </div>

        <TagBadge v-for="tag in task.tags" :key="tag" :label="tag" />
      </div>

      <div
        v-if="task.dueDate || task.startDate"
        class="flex items-center gap-1 mt-2 text-xs text-[var(--st-text-secondary)]"
      >
        <template v-if="task.dueDate">
          <Calendar class="w-3.5 h-3.5" />
          <span>{{ formatDate(task.dueDate) }}</span>
        </template>
        <template v-else-if="task.startDate && task.endDate">
          <CalendarRange class="w-3.5 h-3.5" />
          <span>{{ formatDate(task.startDate) }} → {{ formatDate(task.endDate) }}</span>
        </template>
      </div>

      <div v-if="getChildren().length" class="kanban-no-drag">
        <TaskTree
          :children="getChildren()"
          :all-tasks="allTasks"
          @edit="(t) => emit('edit', t)"
          @status-change="(id, s) => emit('status-change', id, s)"
        />
      </div>
    </div>
  </div>
</template>
