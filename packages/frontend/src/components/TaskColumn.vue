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

/** 整卡可拖：鼠标无延迟可快拖；触摸仍用 delay 区分点击与拖动。filter 区域不发起拖动 */
const sortableOptions = {
  delay: 200,
  delayOnTouchOnly: true,
  filter: '.kanban-no-drag',
  preventOnFilter: true,
}
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-col bg-[#F7F8F9]">
    <div class="flex shrink-0 items-center gap-2 px-3 py-2.5">
      <span
        class="w-2.5 h-2.5 rounded-full shrink-0"
        :style="{ backgroundColor: color }"
      />
      <span class="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide">
        {{ title }}
      </span>
      <span
        class="min-w-[20px] rounded-full bg-[#EBECF0] px-1.5 py-0.5 text-center text-xs text-[#5E6C84]"
      >
        {{ tasks.length }}
      </span>
    </div>
    <div class="relative min-h-0 flex-1 overflow-y-auto p-2 pt-0">
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
