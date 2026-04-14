<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Download, X } from 'lucide-vue-next'
import type { Task, TaskPriority, TaskStatus } from '../types/task'
import { KANBAN_STATUSES } from '../types/task'
import * as api from '../api/tasks'
import {
  TASK_EXPORT_FIELD_KEYS,
  type ExportDateField,
  type ExportFormat,
  type ExportTasksPayload,
  type TaskExportField,
} from '../types/export'

const props = defineProps<{
  tasks: Task[]
}>()

const emit = defineEmits<{
  close: []
}>()

const loading = ref(false)
const errorMsg = ref('')

const format = ref<ExportFormat>('json')
const dateField = ref<ExportDateField>('createdAt')
const dateFrom = ref('')
const dateTo = ref('')
const tag = ref('')

const statusChecked = reactive<Record<TaskStatus, boolean>>({
  todo: false,
  'in-progress': false,
  done: false,
  archived: false,
})

const priorityChecked = reactive<Record<TaskPriority, boolean>>({
  low: false,
  medium: false,
  high: false,
  urgent: false,
})

const fieldChecked = reactive<Record<TaskExportField, boolean>>(
  Object.fromEntries(TASK_EXPORT_FIELD_KEYS.map(k => [k, true])) as Record<
    TaskExportField,
    boolean
  >
)

const statusMeta: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: '待办' },
  { key: 'in-progress', label: '进行中' },
  { key: 'done', label: '已完成' },
  { key: 'archived', label: '归档' },
]

const priorityMeta: { key: TaskPriority; label: string }[] = [
  { key: 'urgent', label: '紧急' },
  { key: 'high', label: '高' },
  { key: 'medium', label: '中' },
  { key: 'low', label: '低' },
]

const dateFieldMeta: { key: ExportDateField; label: string }[] = [
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '更新时间' },
  { key: 'dueDate', label: '截止时间' },
  { key: 'startDate', label: '开始日期' },
  { key: 'endDate', label: '结束日期' },
]

const fieldLabels: Record<TaskExportField, string> = {
  id: 'ID',
  title: '标题',
  description: '描述',
  status: '状态',
  boardOrder: '看板顺序',
  priority: '优先级',
  tags: '标签',
  dueDate: '截止时间',
  startDate: '开始',
  endDate: '结束',
  parentId: '父任务 ID',
  createdAt: '创建时间',
  updatedAt: '更新时间',
}

const allTags = computed(() => {
  const set = new Set<string>()
  for (const t of props.tasks) {
    for (const x of t.tags) set.add(x)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})

function toIso(local: string): string | undefined {
  if (!local.trim()) return undefined
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

function selectedStatuses(): TaskStatus[] {
  return KANBAN_STATUSES.filter(s => statusChecked[s])
}

function selectedPriorities(): TaskPriority[] {
  return (['urgent', 'high', 'medium', 'low'] as TaskPriority[]).filter(
    p => priorityChecked[p]
  )
}

function selectedFields(): TaskExportField[] {
  return TASK_EXPORT_FIELD_KEYS.filter(f => fieldChecked[f])
}

function setAllFields(on: boolean) {
  for (const f of TASK_EXPORT_FIELD_KEYS) {
    fieldChecked[f] = on
  }
}

function buildPayload(): ExportTasksPayload {
  const payload: ExportTasksPayload = { format: format.value }

  const fields = selectedFields()
  if (fields.length < TASK_EXPORT_FIELD_KEYS.length) {
    payload.fields = fields
  }

  const st = selectedStatuses()
  if (st.length > 0 && st.length < KANBAN_STATUSES.length) {
    payload.statuses = st
  }

  const pr = selectedPriorities()
  const allPriCount = 4
  if (pr.length > 0 && pr.length < allPriCount) {
    payload.priorities = pr
  }

  if (tag.value.trim()) {
    payload.tag = tag.value.trim()
  }

  const from = toIso(dateFrom.value)
  const to = toIso(dateTo.value)
  if (from || to) {
    payload.dateRange = {
      field: dateField.value,
      from,
      to,
    }
  }

  return payload
}

async function onDownload() {
  errorMsg.value = ''
  const fields = selectedFields()
  if (fields.length === 0) {
    errorMsg.value = '请至少选择一个导出字段'
    return
  }
  loading.value = true
  try {
    await api.exportTasks(buildPayload())
    emit('close')
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : '导出失败'
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex items-start justify-center pt-[8vh] pb-8 overflow-y-auto bg-[var(--st-shadow-overlay)]"
      @click.self="emit('close')"
    >
      <div
        class="bg-[var(--st-bg-elevated)] rounded-sm shadow-lg w-full max-w-lg border border-[var(--st-border)] my-auto"
        role="dialog"
        aria-labelledby="export-title"
        @click.stop
      >
        <div
          class="flex items-center justify-between px-5 py-3 border-b border-[var(--st-border)]"
        >
          <h2 id="export-title" class="text-base font-semibold text-[var(--st-text-primary)]">
            导出任务
          </h2>
          <button
            type="button"
            class="p-1 rounded text-[var(--st-text-secondary)] hover:bg-[var(--st-bg-muted)]"
            aria-label="关闭"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="px-5 py-4 max-h-[min(70vh,560px)] overflow-y-auto space-y-4 text-sm">
          <div>
            <div class="text-xs font-medium text-[var(--st-text-secondary)] mb-2">格式</div>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="opt in [
                  { v: 'json' as const, l: 'JSON' },
                  { v: 'csv' as const, l: 'CSV' },
                  { v: 'xlsx' as const, l: 'Excel' },
                  { v: 'markdown' as const, l: 'Markdown' },
                ]"
                :key="opt.v"
                class="flex items-center gap-1.5 cursor-pointer"
              >
                <input v-model="format" type="radio" name="export-format" :value="opt.v" />
                <span class="text-[var(--st-text-primary)]">{{ opt.l }}</span>
              </label>
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-[var(--st-text-secondary)] mb-2">
              时间范围（可选）
            </div>
            <div class="flex flex-col gap-2">
              <select
                v-model="dateField"
                class="w-full text-sm bg-[var(--st-bg-surface)] border border-[var(--st-border)] rounded px-2 py-1.5 text-[var(--st-text-primary)]"
              >
                <option v-for="d in dateFieldMeta" :key="d.key" :value="d.key">
                  {{ d.label }}
                </option>
              </select>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex flex-col gap-0.5">
                  <span class="text-[var(--st-text-secondary)] text-xs">开始</span>
                  <input
                    v-model="dateFrom"
                    type="datetime-local"
                    class="text-xs bg-[var(--st-bg-surface)] border border-[var(--st-border)] rounded px-2 py-1 text-[var(--st-text-primary)]"
                  />
                </label>
                <label class="flex flex-col gap-0.5">
                  <span class="text-[var(--st-text-secondary)] text-xs">结束</span>
                  <input
                    v-model="dateTo"
                    type="datetime-local"
                    class="text-xs bg-[var(--st-bg-surface)] border border-[var(--st-border)] rounded px-2 py-1 text-[var(--st-text-primary)]"
                  />
                </label>
              </div>
              <p class="text-xs text-[var(--st-text-secondary)]">
                不填起止则不按时间过滤；筛选时该日期字段为空的任务不会包含在导出中。
              </p>
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-[var(--st-text-secondary)] mb-2">
              状态（不选 = 全部）
            </div>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="s in statusMeta"
                :key="s.key"
                class="flex items-center gap-1.5 cursor-pointer"
              >
                <input v-model="statusChecked[s.key]" type="checkbox" />
                <span>{{ s.label }}</span>
              </label>
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-[var(--st-text-secondary)] mb-2">
              优先级（不选 = 全部）
            </div>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="p in priorityMeta"
                :key="p.key"
                class="flex items-center gap-1.5 cursor-pointer"
              >
                <input v-model="priorityChecked[p.key]" type="checkbox" />
                <span>{{ p.label }}</span>
              </label>
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-[var(--st-text-secondary)] mb-2">标签</div>
            <select
              v-model="tag"
              class="w-full text-sm bg-[var(--st-bg-surface)] border border-[var(--st-border)] rounded px-2 py-1.5 text-[var(--st-text-primary)]"
            >
              <option value="">全部（不按标签过滤）</option>
              <option v-for="t in allTags" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-[var(--st-text-secondary)]">导出字段</span>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="text-xs text-[var(--st-accent)] hover:underline"
                  @click="setAllFields(true)"
                >
                  全选
                </button>
                <button
                  type="button"
                  class="text-xs text-[var(--st-accent)] hover:underline"
                  @click="setAllFields(false)"
                >
                  全不选
                </button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <label
                v-for="f in TASK_EXPORT_FIELD_KEYS"
                :key="f"
                class="flex items-center gap-1.5 cursor-pointer"
              >
                <input v-model="fieldChecked[f]" type="checkbox" />
                <span>{{ fieldLabels[f] }}</span>
              </label>
            </div>
          </div>

          <p v-if="errorMsg" class="text-xs text-[var(--st-danger)]">{{ errorMsg }}</p>
        </div>

        <div
          class="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--st-border)]"
        >
          <button
            type="button"
            class="px-4 py-2 text-sm text-[var(--st-text-primary)] bg-[var(--st-bg-muted)] rounded-sm hover:bg-[var(--st-bg-muted-strong)] transition-colors font-medium"
            :disabled="loading"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-sm bg-[var(--st-header-create-bg)] text-[var(--st-header-create-text)] hover:bg-[var(--st-header-create-hover)] disabled:opacity-50"
            :disabled="loading"
            @click="onDownload"
          >
            <Download class="w-4 h-4" />
            {{ loading ? '导出中…' : '下载' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
