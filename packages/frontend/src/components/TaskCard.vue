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

const priorityConfig: Record<string, { icon: any; color: string; label: string }> = {
  urgent: { icon: ArrowUpFromDot, color: 'text-[#DE350B]', label: '紧急' },
  high: { icon: ArrowUp, color: 'text-[#FF991F]', label: '高' },
  medium: { icon: Minus, color: 'text-[#0065FF]', label: '中' },
  low: { icon: ArrowDown, color: 'text-[#6B778C]', label: '低' },
}

const priorityBorder: Record<string, string> = {
  urgent: 'border-l-[#DE350B]',
  high: 'border-l-[#FF991F]',
  medium: 'border-l-[#0065FF]',
  low: 'border-l-[#6B778C]',
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
    class="bg-white rounded border border-[#DFE1E6] border-l-[3px] transition-colors group relative"
    :class="[
      priorityBorder[task.priority],
      kanban
        ? 'cursor-grab active:cursor-grabbing hover:bg-[#E4F0FF] select-none'
        : 'cursor-pointer hover:bg-[#E4F0FF]',
    ]"
    @click="emit('edit', task)"
  >
    <button
      type="button"
      class="kanban-no-drag absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[#FFEBE6] text-[#6B778C] hover:text-[#DE350B] transition-all z-[1]"
      @click.stop="emit('delete', task.id)"
    >
      <Trash2 class="w-3.5 h-3.5" />
    </button>

    <div class="p-3 min-w-0 pr-10">
      <h4 class="text-sm font-medium text-[#172B4D] leading-5">{{ task.title }}</h4>

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

      <div v-if="task.dueDate || task.startDate" class="flex items-center gap-1 mt-2 text-xs text-[#5E6C84]">
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
