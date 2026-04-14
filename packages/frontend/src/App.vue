<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import type { AppView } from './components/AppHeader.vue'
import DashboardView from './components/DashboardView.vue'
import TaskBoard from './components/TaskBoard.vue'
import GanttView from './components/GanttView.vue'
import TaskModal from './components/TaskModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { useTasks } from './composables/useTasks'

const {
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
} = useTasks()

import { ref, computed } from 'vue'
import type { Task } from './types/task'

const showModal = ref(false)
const editingTask = ref<Task | null>(null)
const view = ref<AppView>('dashboard')
const deletingTaskId = ref<string | null>(null)

const deletingTask = computed(() =>
  deletingTaskId.value ? tasks.value.find(t => t.id === deletingTaskId.value) : null
)

const deleteChildCount = computed(() =>
  deletingTaskId.value ? tasks.value.filter(t => t.parentId === deletingTaskId.value).length : 0
)

const deleteMessage = computed(() => {
  const name = deletingTask.value?.title ?? '该任务'
  const children = deleteChildCount.value
  if (children > 0) {
    return `确定要删除「${name}」及其 ${children} 个子任务吗？此操作不可撤销。`
  }
  return `确定要删除「${name}」吗？此操作不可撤销。`
})

function openCreate() {
  editingTask.value = null
  showModal.value = true
}

function openEdit(task: Task) {
  editingTask.value = task
  showModal.value = true
}

async function handleSave(data: Partial<Task>) {
  if (editingTask.value) {
    await updateTask(editingTask.value.id, data)
  } else {
    await createTask(data as { title: string } & Partial<Task>)
  }
  showModal.value = false
}

function requestDelete(id: string) {
  deletingTaskId.value = id
}

async function confirmDelete() {
  if (deletingTaskId.value) {
    await deleteTask(deletingTaskId.value)
    deletingTaskId.value = null
  }
}

function cancelDelete() {
  deletingTaskId.value = null
}

async function handleStatusChange(id: string, status: Task['status']) {
  await updateStatus(id, status)
}
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-[#F4F5F7]">
    <AppHeader
      :filters="filters"
      :view="view"
      @update:filters="setFilter"
      @update:view="view = $event"
      @create="openCreate"
    />
    <DashboardView
      v-if="view === 'dashboard'"
      :tasks="tasks"
      :loading="loading"
      @edit="openEdit"
    />
    <TaskBoard
      v-else-if="view === 'kanban'"
      :tasks="tasks"
      :loading="loading"
      :reorder-kanban="reorderKanban"
      @edit="openEdit"
      @delete="requestDelete"
      @status-change="handleStatusChange"
    />
    <GanttView
      v-else
      :tasks="tasks"
      :loading="loading"
      @edit="openEdit"
    />
    <TaskModal
      v-if="showModal"
      :task="editingTask"
      :tasks="tasks"
      @save="handleSave"
      @close="showModal = false"
    />
    <ConfirmDialog
      v-if="deletingTaskId"
      :message="deleteMessage"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>
