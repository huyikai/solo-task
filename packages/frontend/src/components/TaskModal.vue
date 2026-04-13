<script setup lang="ts">
import { reactive, computed, onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'
import MarkdownEditor from './MarkdownEditor.vue'
import type { Task, TaskStatus, TaskPriority } from '../types/task'

const props = defineProps<{
  task: Task | null
  tasks: Task[]
}>()

const emit = defineEmits<{
  save: [data: Partial<Task>]
  close: []
}>()

const isEdit = computed(() => !!props.task)

const form = reactive({
  title: props.task?.title ?? '',
  description: props.task?.description ?? '',
  status: props.task?.status ?? 'todo' as TaskStatus,
  priority: props.task?.priority ?? 'medium' as TaskPriority,
  tags: [...(props.task?.tags ?? [])],
  timeType: props.task?.dueDate ? 'deadline' : props.task?.startDate ? 'range' : 'none',
  dueDate: props.task?.dueDate?.slice(0, 16) ?? '',
  startDate: props.task?.startDate?.slice(0, 16) ?? '',
  endDate: props.task?.endDate?.slice(0, 16) ?? '',
  parentId: props.task?.parentId ?? '',
  newTag: '',
})

const availableParents = computed(() => {
  const editId = props.task?.id
  const childIds = new Set<string>()
  if (editId) {
    function collectDescendants(parentId: string) {
      for (const t of props.tasks) {
        if (t.parentId === parentId && !childIds.has(t.id)) {
          childIds.add(t.id)
          collectDescendants(t.id)
        }
      }
    }
    collectDescendants(editId)
  }
  return props.tasks.filter(t =>
    t.id !== editId && !childIds.has(t.id) && !t.parentId
  )
})

function addTag() {
  const tag = form.newTag.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  form.newTag = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter(t => t !== tag)
}

function handleSubmit() {
  if (!form.title.trim()) return

  const data: Partial<Task> = {
    title: form.title.trim(),
    description: form.description,
    status: form.status,
    priority: form.priority,
    tags: form.tags,
    parentId: form.parentId || null,
    dueDate: null,
    startDate: null,
    endDate: null,
  }

  if (form.timeType === 'deadline' && form.dueDate) {
    data.dueDate = new Date(form.dueDate).toISOString()
  } else if (form.timeType === 'range' && form.startDate && form.endDate) {
    data.startDate = new Date(form.startDate).toISOString()
    data.endDate = new Date(form.endDate).toISOString()
  }

  emit('save', data)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '待办' },
  { value: 'in-progress', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'archived', label: '归档' },
]

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50"
      @click.self="emit('close')"
    >
      <div
        class="bg-white rounded-sm shadow-lg w-full max-w-[640px] max-h-[80vh] flex flex-col"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-[#DFE1E6]">
          <h2 class="text-lg font-semibold text-[#172B4D]">
            {{ isEdit ? '编辑任务' : '创建任务' }}
          </h2>
          <button
            class="p-1 rounded hover:bg-[#EBECF0] text-[#6B778C] transition-colors"
            @click="emit('close')"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <form class="flex-1 overflow-y-auto p-5 space-y-5" @submit.prevent="handleSubmit">
          <!-- Title -->
          <div>
            <label class="block text-xs font-semibold text-[#6B778C] uppercase mb-1">
              标题 <span class="text-[#DE350B]">*</span>
            </label>
            <input
              v-model="form.title"
              type="text"
              class="w-full border border-[#DFE1E6] rounded-sm px-3 py-2 text-sm text-[#172B4D] outline-none focus:border-[#4C9AFF] focus:ring-2 focus:ring-[#4C9AFF]/20 transition"
              placeholder="输入任务标题"
              autofocus
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-[#6B778C] uppercase mb-1">描述</label>
            <MarkdownEditor v-model="form.description" :rows="8" />
          </div>

          <!-- Status + Priority (side by side) -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#6B778C] uppercase mb-1">状态</label>
              <select
                v-model="form.status"
                class="w-full border border-[#DFE1E6] rounded-sm px-3 py-2 text-sm text-[#172B4D] outline-none focus:border-[#4C9AFF] bg-white"
              >
                <option v-for="o in statusOptions" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#6B778C] uppercase mb-1">优先级</label>
              <select
                v-model="form.priority"
                class="w-full border border-[#DFE1E6] rounded-sm px-3 py-2 text-sm text-[#172B4D] outline-none focus:border-[#4C9AFF] bg-white"
              >
                <option v-for="o in priorityOptions" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Tags -->
          <div>
            <label class="block text-xs font-semibold text-[#6B778C] uppercase mb-1">标签</label>
            <div class="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                v-for="tag in form.tags"
                :key="tag"
                class="inline-flex items-center gap-1 bg-[#DEEBFF] text-[#0747A6] text-xs font-medium px-2 py-0.5 rounded-sm"
              >
                {{ tag }}
                <button
                  type="button"
                  class="hover:text-[#DE350B] transition-colors"
                  @click="removeTag(tag)"
                >
                  <X class="w-3 h-3" />
                </button>
              </span>
            </div>
            <div class="flex gap-2">
              <input
                v-model="form.newTag"
                type="text"
                class="flex-1 border border-[#DFE1E6] rounded-sm px-3 py-1.5 text-sm text-[#172B4D] outline-none focus:border-[#4C9AFF]"
                placeholder="输入标签名"
                @keydown.enter.prevent="addTag"
              />
              <button
                type="button"
                class="px-3 py-1.5 bg-[#F4F5F7] text-[#172B4D] text-sm rounded-sm hover:bg-[#EBECF0] transition-colors"
                @click="addTag"
              >
                添加
              </button>
            </div>
          </div>

          <!-- Time Type -->
          <div>
            <label class="block text-xs font-semibold text-[#6B778C] uppercase mb-2">时间</label>
            <div class="flex gap-4 mb-3">
              <label class="flex items-center gap-1.5 text-sm text-[#172B4D] cursor-pointer">
                <input v-model="form.timeType" type="radio" value="none" class="accent-[#0052CC]" />
                无时间
              </label>
              <label class="flex items-center gap-1.5 text-sm text-[#172B4D] cursor-pointer">
                <input v-model="form.timeType" type="radio" value="deadline" class="accent-[#0052CC]" />
                截止日期
              </label>
              <label class="flex items-center gap-1.5 text-sm text-[#172B4D] cursor-pointer">
                <input v-model="form.timeType" type="radio" value="range" class="accent-[#0052CC]" />
                时间区间
              </label>
            </div>

            <div v-if="form.timeType === 'deadline'">
              <input
                v-model="form.dueDate"
                type="datetime-local"
                class="w-full border border-[#DFE1E6] rounded-sm px-3 py-2 text-sm text-[#172B4D] outline-none focus:border-[#4C9AFF]"
              />
            </div>
            <div v-else-if="form.timeType === 'range'" class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-[#6B778C] mb-1">开始</label>
                <input
                  v-model="form.startDate"
                  type="datetime-local"
                  class="w-full border border-[#DFE1E6] rounded-sm px-3 py-2 text-sm text-[#172B4D] outline-none focus:border-[#4C9AFF]"
                />
              </div>
              <div>
                <label class="block text-xs text-[#6B778C] mb-1">结束</label>
                <input
                  v-model="form.endDate"
                  type="datetime-local"
                  class="w-full border border-[#DFE1E6] rounded-sm px-3 py-2 text-sm text-[#172B4D] outline-none focus:border-[#4C9AFF]"
                />
              </div>
            </div>
          </div>

          <!-- Parent Task -->
          <div>
            <label class="block text-xs font-semibold text-[#6B778C] uppercase mb-1">父任务</label>
            <select
              v-model="form.parentId"
              class="w-full border border-[#DFE1E6] rounded-sm px-3 py-2 text-sm text-[#172B4D] outline-none focus:border-[#4C9AFF] bg-white"
            >
              <option value="">无</option>
              <option v-for="t in availableParents" :key="t.id" :value="t.id">
                {{ t.title }}
              </option>
            </select>
          </div>
        </form>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#DFE1E6]">
          <button
            type="button"
            class="px-4 py-2 text-sm text-[#172B4D] bg-[#F4F5F7] rounded-sm hover:bg-[#EBECF0] transition-colors font-medium"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm text-white bg-[#0052CC] rounded-sm hover:bg-[#0065FF] transition-colors font-medium disabled:opacity-50"
            :disabled="!form.title.trim()"
            @click="handleSubmit"
          >
            {{ isEdit ? '保存' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
