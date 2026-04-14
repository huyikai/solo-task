import { ref, onMounted, reactive } from 'vue'
import type { KanbanReorderColumns, Task } from '../types/task'
import * as api from '../api/tasks'

export function useTasks() {
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const filters = reactive<Record<string, string>>({})

  function hasActiveFilters(): boolean {
    for (const v of Object.values(filters)) {
      if (v) return true
    }
    return false
  }

  async function fetchTasks(opts?: { silent?: boolean }) {
    const silent = opts?.silent ?? false
    if (!silent) loading.value = true
    try {
      const cleanFilters: Record<string, string> = {}
      for (const [k, v] of Object.entries(filters)) {
        if (v) cleanFilters[k] = v
      }
      tasks.value = await api.fetchTasks(
        Object.keys(cleanFilters).length ? cleanFilters : undefined
      )
    } finally {
      if (!silent) loading.value = false
    }
  }

  function setFilter(key: string, value: string) {
    if (value) {
      filters[key] = value
    } else {
      delete filters[key]
    }
    fetchTasks()
  }

  async function createTask(data: Partial<Task> & { title: string }) {
    await api.createTask(data)
    await fetchTasks()
  }

  async function updateTask(id: string, data: Partial<Task>) {
    await api.updateTask(id, data)
    await fetchTasks()
  }

  async function deleteTask(id: string) {
    await api.deleteTask(id)
    await fetchTasks()
  }

  async function updateStatus(id: string, status: Task['status']) {
    await api.updateTaskStatus(id, status)
    await fetchTasks()
  }

  async function reorderKanban(columns: KanbanReorderColumns) {
    const updated = await api.reorderKanban(columns)
    if (!hasActiveFilters()) {
      tasks.value = updated
    } else {
      await fetchTasks({ silent: true })
    }
  }

  onMounted(fetchTasks)

  return {
    tasks,
    loading,
    filters,
    setFilter,
    createTask,
    updateTask,
    deleteTask,
    updateStatus,
    reorderKanban,
    fetchTasks,
  }
}
