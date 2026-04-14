<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
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
} = useTasks()

import { ref, computed } from 'vue'
import type { Task } from './types/task'

const showModal = ref(false)
const editingTask = ref<Task | null>(null)
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
  <div class="flex h-screen flex-col overflow-hidden bg-[var(--st-bg-page)]">
    <AppHeader
      :filters="filters"
      @update:filters="setFilter"
      @create="openCreate"
    />
    <router-view v-slot="{ Component }">
      <component
        :is="Component"
        v-if="Component"
        :tasks="tasks"
        :loading="loading"
        :reorder-kanban="reorderKanban"
        @edit="openEdit"
        @delete="requestDelete"
        @status-change="handleStatusChange"
      />
    </router-view>
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
