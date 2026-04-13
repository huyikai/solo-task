<script setup lang="ts">
import type { Task } from '../types/task'
import TaskCard from './TaskCard.vue'

defineProps<{
  title: string
  status: Task['status']
  tasks: Task[]
  allTasks: Task[]
  color: string
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  'status-change': [id: string, status: Task['status']]
}>()
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
    <div class="bg-[#EBECF0]/50 rounded-b p-2 space-y-2 flex-1 overflow-y-auto min-h-0">
      <TaskCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :all-tasks="allTasks"
        @edit="(t) => emit('edit', t)"
        @delete="(id) => emit('delete', id)"
        @status-change="(id, s) => emit('status-change', id, s)"
      />
      <div
        v-if="tasks.length === 0"
        class="text-center text-xs text-[#6B778C] py-8"
      >
        暂无任务
      </div>
    </div>
  </div>
</template>
