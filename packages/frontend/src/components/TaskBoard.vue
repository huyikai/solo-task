<script setup lang="ts">
import { computed } from 'vue'
import type { Task } from '../types/task'
import TaskColumn from './TaskColumn.vue'

const props = defineProps<{
  tasks: Task[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [task: Task]
  delete: [id: string]
  'status-change': [id: string, status: Task['status']]
}>()

const columns: { key: Task['status']; title: string; color: string }[] = [
  { key: 'todo', title: '待办', color: '#0052CC' },
  { key: 'in-progress', title: '进行中', color: '#FF991F' },
  { key: 'done', title: '已完成', color: '#00875A' },
  { key: 'archived', title: '归档', color: '#6B778C' },
]

const taskIds = computed(() => new Set(props.tasks.map(t => t.id)))

const topLevelTasks = computed(() =>
  props.tasks.filter(t =>
    !t.parentId || t.parentId === t.id || !taskIds.value.has(t.parentId)
  )
)

function tasksForStatus(status: Task['status']): Task[] {
  return topLevelTasks.value.filter(t => t.status === status)
}
</script>

<template>
  <main class="flex-1 p-6 overflow-hidden">
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-[#5E6C84] text-sm">加载中...</div>
    </div>
    <div v-else class="grid grid-cols-4 gap-4 h-full">
      <TaskColumn
        v-for="col in columns"
        :key="col.key"
        :title="col.title"
        :status="col.key"
        :tasks="tasksForStatus(col.key)"
        :all-tasks="tasks"
        :color="col.color"
        @edit="(t) => emit('edit', t)"
        @delete="(id) => emit('delete', id)"
        @status-change="(id, s) => emit('status-change', id, s)"
      />
    </div>
  </main>
</template>
