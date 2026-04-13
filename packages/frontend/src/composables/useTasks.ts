import { ref, onMounted, reactive } from 'vue'
import type { Task } from '../types/task'
import * as api from '../api/tasks'

export function useTasks() {
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const filters = reactive<Record<string, string>>({})

  async function fetchTasks() {
    loading.value = true
    try {
      const cleanFilters: Record<string, string> = {}
      for (const [k, v] of Object.entries(filters)) {
        if (v) cleanFilters[k] = v
      }
      tasks.value = await api.fetchTasks(
        Object.keys(cleanFilters).length ? cleanFilters : undefined
      )
    } finally {
      loading.value = false
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
    fetchTasks,
  }
}
