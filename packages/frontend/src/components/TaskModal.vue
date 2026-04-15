<script setup lang="ts">
import { reactive, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { X, ChevronDown } from 'lucide-vue-next'
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

/** 将接口返回的 ISO 时间转为 datetime-local 所需的本地墙钟时间（避免把 UTC 切片误当本地时间） */
function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const form = reactive({
  title: props.task?.title ?? '',
  description: props.task?.description ?? '',
  status: props.task?.status ?? ('todo' as TaskStatus),
  priority: props.task?.priority ?? ('medium' as TaskPriority),
  tags: [...(props.task?.tags ?? [])],
  timeType: props.task?.dueDate ? 'deadline' : props.task?.startDate ? 'range' : 'none',
  dueDate: isoToDatetimeLocalValue(props.task?.dueDate),
  startDate: isoToDatetimeLocalValue(props.task?.startDate),
  endDate: isoToDatetimeLocalValue(props.task?.endDate),
  parentId: props.task?.parentId ?? '',
  newTag: '',
})

/** 新建/切换时间类型时的默认时刻：起始、截止日期（时间点）均为 8:00；区间结束为 17:00；已有值不覆盖 */
const DEFAULT_START_TIME = '08:00'
const DEFAULT_END_TIME = '17:00'

function localDateYYYYMMDD(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function combineDateAndTime(datePart: string, timeHHmm: string) {
  return `${datePart}T${timeHHmm}`
}

watch(
  () => form.timeType,
  next => {
    if (next === 'deadline' && !form.dueDate.trim()) {
      form.dueDate = combineDateAndTime(localDateYYYYMMDD(), DEFAULT_START_TIME)
    }
    if (next === 'range') {
      if (!form.startDate.trim()) {
        form.startDate = combineDateAndTime(localDateYYYYMMDD(), DEFAULT_START_TIME)
      }
      if (!form.endDate.trim()) {
        const datePart =
          form.startDate.trim().length >= 10 ? form.startDate.slice(0, 10) : localDateYYYYMMDD()
        form.endDate = combineDateAndTime(datePart, DEFAULT_END_TIME)
      }
    }
  }
)

function ensureDueDateDefault() {
  if (form.timeType !== 'deadline') return
  if (!form.dueDate.trim()) {
    form.dueDate = combineDateAndTime(localDateYYYYMMDD(), DEFAULT_START_TIME)
  }
}

function ensureStartDateDefault() {
  if (form.timeType !== 'range') return
  if (!form.startDate.trim()) {
    form.startDate = combineDateAndTime(localDateYYYYMMDD(), DEFAULT_START_TIME)
  }
}

function ensureEndDateDefault() {
  if (form.timeType !== 'range') return
  if (!form.endDate.trim()) {
    const datePart =
      form.startDate.trim().length >= 10 ? form.startDate.slice(0, 10) : localDateYYYYMMDD()
    form.endDate = combineDateAndTime(datePart, DEFAULT_END_TIME)
  }
}

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
  return props.tasks.filter(t => t.id !== editId && !childIds.has(t.id) && !t.parentId)
})

const parentComboOpen = ref(false)
const parentSearchQuery = ref('')
const parentComboRoot = ref<HTMLElement | null>(null)
const parentSearchInput = ref<HTMLInputElement | null>(null)

const filteredParents = computed(() => {
  const q = parentSearchQuery.value.trim().toLowerCase()
  if (!q) return availableParents.value
  return availableParents.value.filter(t => t.title.toLowerCase().includes(q))
})

const selectedParentLabel = computed(() => {
  if (!form.parentId) return '无'
  const t = props.tasks.find(x => x.id === form.parentId)
  return t?.title ?? '无'
})

function openParentCombo() {
  parentComboOpen.value = true
  parentSearchQuery.value = ''
  nextTick(() => parentSearchInput.value?.focus())
}

function toggleParentCombo() {
  if (parentComboOpen.value) closeParentCombo()
  else openParentCombo()
}

function closeParentCombo() {
  parentComboOpen.value = false
}

function setParentId(id: string) {
  form.parentId = id
  closeParentCombo()
}

function onParentComboDocMouseDown(e: MouseEvent) {
  if (!parentComboOpen.value) return
  const el = parentComboRoot.value
  if (el && !el.contains(e.target as Node)) closeParentCombo()
}

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
  if (e.key !== 'Escape') return
  if (parentComboOpen.value) {
    closeParentCombo()
    return
  }
  emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('mousedown', onParentComboDocMouseDown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousedown', onParentComboDocMouseDown)
})

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
      class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-[var(--st-shadow-overlay)]"
      @click.self="emit('close')"
    >
      <div
        class="bg-[var(--st-bg-elevated)] rounded-sm shadow-lg w-full max-w-[640px] max-h-[80vh] flex flex-col border border-[var(--st-border)]"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--st-border)]">
          <h2 class="text-lg font-semibold text-[var(--st-text-primary)]">
            {{ isEdit ? '编辑任务' : '创建任务' }}
          </h2>
          <button
            class="p-1 rounded hover:bg-[var(--st-bg-muted-strong)] text-[var(--st-text-muted)] transition-colors"
            @click="emit('close')"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <form class="flex-1 overflow-y-auto p-5 space-y-5" @submit.prevent="handleSubmit">
          <!-- Title -->
          <div>
            <label class="block text-xs font-semibold text-[var(--st-text-muted)] uppercase mb-1">
              标题 <span class="text-[var(--st-danger)]">*</span>
            </label>
            <input
              v-model="form.title"
              type="text"
              class="w-full border border-[var(--st-border)] rounded-sm px-3 py-2 text-sm text-[var(--st-text-primary)] bg-[var(--st-bg-surface)] outline-none transition"
              placeholder="输入任务标题"
              autofocus
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-xs font-semibold text-[var(--st-text-muted)] uppercase mb-1">描述</label>
            <MarkdownEditor v-model="form.description" :rows="8" />
          </div>

          <!-- Status + Priority (side by side) -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[var(--st-text-muted)] uppercase mb-1">状态</label>
              <select
                v-model="form.status"
                class="w-full border border-[var(--st-border)] rounded-sm px-3 py-2 text-sm text-[var(--st-text-primary)] outline-none bg-[var(--st-bg-surface)]"
              >
                <option v-for="o in statusOptions" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[var(--st-text-muted)] uppercase mb-1">优先级</label>
              <select
                v-model="form.priority"
                class="w-full border border-[var(--st-border)] rounded-sm px-3 py-2 text-sm text-[var(--st-text-primary)] outline-none bg-[var(--st-bg-surface)]"
              >
                <option v-for="o in priorityOptions" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Tags -->
          <div>
            <label class="block text-xs font-semibold text-[var(--st-text-muted)] uppercase mb-1">标签</label>
            <div class="flex flex-wrap items-center gap-1.5 mb-2">
              <span
                v-for="tag in form.tags"
                :key="tag"
                class="inline-flex items-center gap-1 bg-[var(--st-tag-0-bg)] text-[var(--st-tag-0-fg)] text-xs font-medium px-2 py-0.5 rounded-sm"
              >
                {{ tag }}
                <button
                  type="button"
                  class="hover:text-[var(--st-danger)] transition-colors"
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
                class="flex-1 border border-[var(--st-border)] rounded-sm px-3 py-1.5 text-sm text-[var(--st-text-primary)] bg-[var(--st-bg-surface)] outline-none"
                placeholder="输入标签名"
                @keydown.enter.prevent="addTag"
              />
              <button
                type="button"
                class="px-3 py-1.5 bg-[var(--st-bg-muted)] text-[var(--st-text-primary)] text-sm rounded-sm hover:bg-[var(--st-bg-muted-strong)] transition-colors"
                @click="addTag"
              >
                添加
              </button>
            </div>
          </div>

          <!-- Time Type -->
          <div>
            <label class="block text-xs font-semibold text-[var(--st-text-muted)] uppercase mb-2">时间</label>
            <div class="flex gap-4 mb-3 flex-wrap">
              <label class="flex items-center gap-1.5 text-sm text-[var(--st-text-primary)] cursor-pointer">
                <input v-model="form.timeType" type="radio" value="none" class="accent-[var(--st-accent)]" />
                无时间
              </label>
              <label class="flex items-center gap-1.5 text-sm text-[var(--st-text-primary)] cursor-pointer">
                <input
                  v-model="form.timeType"
                  type="radio"
                  value="deadline"
                  class="accent-[var(--st-accent)]"
                />
                截止日期
              </label>
              <label class="flex items-center gap-1.5 text-sm text-[var(--st-text-primary)] cursor-pointer">
                <input v-model="form.timeType" type="radio" value="range" class="accent-[var(--st-accent)]" />
                时间区间
              </label>
            </div>

            <div v-if="form.timeType === 'deadline'">
              <input
                v-model="form.dueDate"
                type="datetime-local"
                class="w-full border border-[var(--st-border)] rounded-sm px-3 py-2 text-sm text-[var(--st-text-primary)] bg-[var(--st-bg-surface)] outline-none"
                @focus="ensureDueDateDefault"
              />
            </div>
            <div v-else-if="form.timeType === 'range'" class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-[var(--st-text-muted)] mb-1">开始</label>
                <input
                  v-model="form.startDate"
                  type="datetime-local"
                  class="w-full border border-[var(--st-border)] rounded-sm px-3 py-2 text-sm text-[var(--st-text-primary)] bg-[var(--st-bg-surface)] outline-none"
                  @focus="ensureStartDateDefault"
                />
              </div>
              <div>
                <label class="block text-xs text-[var(--st-text-muted)] mb-1">结束</label>
                <input
                  v-model="form.endDate"
                  type="datetime-local"
                  class="w-full border border-[var(--st-border)] rounded-sm px-3 py-2 text-sm text-[var(--st-text-primary)] bg-[var(--st-bg-surface)] outline-none"
                  @focus="ensureEndDateDefault"
                />
              </div>
            </div>
          </div>

          <!-- Parent Task (searchable) -->
          <div ref="parentComboRoot" class="relative">
            <label class="block text-xs font-semibold text-[var(--st-text-muted)] uppercase mb-1">父任务</label>
            <button
              type="button"
              class="w-full flex items-center gap-2 border border-[var(--st-border)] rounded-sm px-3 py-2 text-sm text-left text-[var(--st-text-primary)] outline-none bg-[var(--st-bg-surface)] hover:bg-[var(--st-bg-muted)]/30 transition-colors"
              :class="parentComboOpen ? 'border-[var(--st-border-muted)]' : ''"
              @click="toggleParentCombo"
            >
              <span class="flex-1 truncate">{{ selectedParentLabel }}</span>
              <ChevronDown
                class="w-4 h-4 shrink-0 text-[var(--st-text-muted)] transition-transform"
                :class="parentComboOpen ? 'rotate-180' : ''"
              />
            </button>
            <div
              v-if="parentComboOpen"
              class="absolute z-[60] left-0 right-0 mt-1 rounded-sm border border-[var(--st-border)] bg-[var(--st-bg-elevated)] shadow-lg flex flex-col max-h-64 overflow-hidden"
              @mousedown.prevent
            >
              <input
                ref="parentSearchInput"
                v-model="parentSearchQuery"
                type="text"
                class="w-full border-b border-[var(--st-border)] px-3 py-2 text-sm text-[var(--st-text-primary)] bg-[var(--st-bg-surface)] outline-none placeholder:text-[var(--st-text-muted)]"
                placeholder="输入关键词筛选父任务"
              />
              <ul class="overflow-y-auto py-1">
                <li>
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2 text-sm text-[var(--st-text-primary)] hover:bg-[var(--st-bg-muted)] transition-colors"
                    :class="!form.parentId ? 'bg-[var(--st-bg-muted)]/50' : ''"
                    @click="setParentId('')"
                  >
                    无
                  </button>
                </li>
                <li v-for="t in filteredParents" :key="t.id">
                  <button
                    type="button"
                    class="w-full text-left px-3 py-2 text-sm text-[var(--st-text-primary)] hover:bg-[var(--st-bg-muted)] transition-colors truncate"
                    :class="form.parentId === t.id ? 'bg-[var(--st-bg-muted)]/50' : ''"
                    :title="t.title"
                    @click="setParentId(t.id)"
                  >
                    {{ t.title }}
                  </button>
                </li>
                <li
                  v-if="filteredParents.length === 0 && parentSearchQuery.trim()"
                  class="px-3 py-2 text-sm text-[var(--st-text-muted)]"
                >
                  无匹配任务
                </li>
              </ul>
            </div>
          </div>
        </form>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--st-border)]">
          <button
            type="button"
            class="px-4 py-2 text-sm text-[var(--st-text-primary)] bg-[var(--st-bg-muted)] rounded-sm hover:bg-[var(--st-bg-muted-strong)] transition-colors font-medium"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm text-white bg-[var(--st-accent)] rounded-sm hover:bg-[var(--st-accent-hover)] transition-colors font-medium disabled:opacity-50"
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
