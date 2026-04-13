<script setup lang="ts">
import { ref } from 'vue'
import type { Task } from '../types/task'
import {
  ChevronRight,
  ChevronDown,
  ArrowUpFromDot,
  ArrowUp,
  Minus,
  ArrowDown,
} from 'lucide-vue-next'

const props = defineProps<{
  children: Task[]
  allTasks: Task[]
}>()

const emit = defineEmits<{
  edit: [task: Task]
  'status-change': [id: string, status: Task['status']]
}>()

const expanded = ref(true)

function getSubChildren(parentId: string): Task[] {
  return props.allTasks.filter(t => t.parentId === parentId)
}

const priorityIcon: Record<string, { icon: any; color: string }> = {
  urgent: { icon: ArrowUpFromDot, color: 'text-[#DE350B]' },
  high: { icon: ArrowUp, color: 'text-[#FF991F]' },
  medium: { icon: Minus, color: 'text-[#0065FF]' },
  low: { icon: ArrowDown, color: 'text-[#6B778C]' },
}
</script>

<template>
  <div v-if="children.length" class="mt-1.5" @click.stop>
    <button
      class="flex items-center gap-1 text-xs text-[#5E6C84] hover:text-[#172B4D] mb-1"
      @click.stop="expanded = !expanded"
    >
      <component :is="expanded ? ChevronDown : ChevronRight" class="w-3.5 h-3.5" />
      {{ children.length }} 个子任务
    </button>
    <div v-if="expanded" class="border-l-2 border-[#DFE1E6] pl-3 space-y-1">
      <div
        v-for="child in children"
        :key="child.id"
        class="flex items-center gap-1.5 text-sm text-[#172B4D] py-0.5 px-1 rounded hover:bg-[#EBECF0] cursor-pointer group"
        @click.stop="emit('edit', child)"
      >
        <component
          :is="priorityIcon[child.priority]?.icon"
          class="w-3.5 h-3.5 shrink-0"
          :class="priorityIcon[child.priority]?.color"
        />
        <span class="truncate flex-1" :class="{ 'line-through text-[#5E6C84]': child.status === 'done' }">
          {{ child.title }}
        </span>
      </div>
    </div>
  </div>
</template>
