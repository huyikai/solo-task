<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { KanbanReorderColumns, Task } from '../types/task'
import { KANBAN_STATUSES } from '../types/task'
import TaskColumn from './TaskColumn.vue'

const props = defineProps<{
  tasks: Task[]
  loading: boolean
  reorderKanban: (columns: KanbanReorderColumns) => Promise<void>
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

const columnLists = reactive<Record<Task['status'], Task[]>>({
  todo: [],
  'in-progress': [],
  done: [],
  archived: [],
})

function resyncColumnLists() {
  for (const s of KANBAN_STATUSES) {
    columnLists[s] = topLevelTasks.value
      .filter(t => t.status === s)
      .slice()
      .sort((a, b) => (a.boardOrder ?? 0) - (b.boardOrder ?? 0))
  }
}

watch(() => props.tasks, resyncColumnLists, { deep: true, immediate: true })

function buildKanbanPayload(): KanbanReorderColumns {
  return {
    todo: columnLists.todo.map(t => t.id),
    'in-progress': columnLists['in-progress'].map(t => t.id),
    done: columnLists.done.map(t => t.id),
    archived: columnLists.archived.map(t => t.id),
  }
}

const submitting = ref(false)
/** Sortable 跨列时可能对两端各触发一次 end */
let dragEndDebounce: ReturnType<typeof setTimeout> | null = null

function onKanbanDragEnd() {
  if (dragEndDebounce) clearTimeout(dragEndDebounce)
  dragEndDebounce = setTimeout(() => {
    dragEndDebounce = null
    void submitKanbanReorder()
  }, 80)
}

async function submitKanbanReorder() {
  if (submitting.value) return
  submitting.value = true
  try {
    await props.reorderKanban(buildKanbanPayload())
  } catch {
    resyncColumnLists()
  } finally {
    submitting.value = false
  }
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
        v-model:tasks="columnLists[col.key]"
        :title="col.title"
        :status="col.key"
        :all-tasks="tasks"
        :color="col.color"
        @edit="(t) => emit('edit', t)"
        @delete="(id) => emit('delete', id)"
        @status-change="(id, s) => emit('status-change', id, s)"
        @drag-end="onKanbanDragEnd"
      />
    </div>
  </main>
</template>
