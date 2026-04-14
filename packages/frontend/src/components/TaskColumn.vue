<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { Task } from '../types/task'
import TaskCard from './TaskCard.vue'

const tasks = defineModel<Task[]>('tasks', { required: true })

defineProps<{
  title: string
  status: Task['status']
  allTasks: Task[]
  color: string
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  'status-change': [id: string, status: Task['status']]
  'drag-end': []
}>()

const group = { name: 'kanban', pull: true, put: true }

/** 整卡可拖：短按仍可点击；按住超过 delay 再移动为拖动。filter 区域不发起拖动 */
const sortableOptions = {
  delay: 200,
  filter: '.kanban-no-drag',
  preventOnFilter: true,
}
</script>

<template>
  <div class="flex flex-col min-w-0 min-h-0">
    <div class="bg-[#EBECF0] rounded-t px-3 py-2.5 flex items-center gap-2 shrink-0">
      <span
        class="w-2.5 h-2.5 rounded-full shrink-0"
        :style="{ backgroundColor: color }"
      />
      <span class="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide">
        {{ title }}
      </span>
      <span class="text-xs text-[#5E6C84] bg-[#DFE1E6] rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
        {{ tasks.length }}
      </span>
    </div>
    <div class="bg-[#EBECF0]/50 rounded-b p-2 flex-1 overflow-y-auto min-h-0 relative">
      <div class="relative min-h-[120px]">
        <VueDraggable
          v-model="tasks"
          :group="group"
          :animation="180"
          v-bind="sortableOptions"
          class="space-y-2 min-h-[120px]"
          @end="emit('drag-end')"
        >
          <div v-for="task in tasks" :key="task.id">
            <TaskCard
              :task="task"
              :all-tasks="allTasks"
              kanban
              @edit="(t) => emit('edit', t)"
              @delete="(id) => emit('delete', id)"
              @status-change="(id, s) => emit('status-change', id, s)"
            />
          </div>
        </VueDraggable>
        <div
          v-if="tasks.length === 0"
          class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[#6B778C]"
        >
          暂无任务
        </div>
      </div>
    </div>
  </div>
</template>
