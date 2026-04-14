<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import {
  Plus,
  ListFilter,
  LayoutDashboard,
  LayoutGrid,
  ChartGantt,
  Download,
  Search,
} from 'lucide-vue-next'
import { useTheme, type ThemePreference } from '../composables/useTheme'
import type { Task } from '../types/task'
import ExportDialog from './ExportDialog.vue'

const props = defineProps<{
  filters: Record<string, string>
  tasks: Task[]
}>()

const showExport = ref(false)

const emit = defineEmits<{
  'update:filters': [key: string, value: string]
  create: []
}>()

const searchDraft = ref(props.filters.q ?? '')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.filters.q,
  v => {
    searchDraft.value = v ?? ''
  }
)

function onSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    searchDebounce = null
    emit('update:filters', 'q', searchDraft.value)
  }, 320)
}

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
})

const { themePreference, resolvedTheme, setTheme } = useTheme()

function onThemeChange(e: Event) {
  setTheme((e.target as HTMLSelectElement).value as ThemePreference)
}

const priorities = [
  { value: '', label: '全部优先级' },
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

function navBtnClass(isActive: boolean, withLeftBorder: boolean) {
  const base =
    'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors min-h-[2.25rem]'
  const border = withLeftBorder ? 'border-l border-[var(--st-header-group-border)]' : ''
  if (!isActive) {
    return [base, border, 'text-[var(--st-header-nav-text)] hover:bg-[var(--st-header-nav-hover)]'].join(
      ' '
    )
  }
  if (resolvedTheme.value === 'dark') {
    return [
      base,
      border,
      'bg-transparent text-[var(--st-accent)] border-b-2 border-[var(--st-accent)] rounded-none',
    ].join(' ')
  }
  return [base, border, 'bg-[var(--st-header-nav-active-bg)] text-[var(--st-header-nav-active-text)]'].join(
    ' '
  )
}
</script>

<template>
  <header
    class="h-14 flex items-center px-6 shrink-0 border-b border-[var(--st-border)] bg-[var(--st-header-bg)]"
  >
    <div class="flex items-center gap-2">
      <div
        class="w-7 h-7 rounded flex items-center justify-center font-bold text-sm bg-[var(--st-header-logo-bg)] text-[var(--st-header-title)]"
      >
        S
      </div>
      <span class="text-lg font-semibold tracking-tight text-[var(--st-header-title)]">solo-task</span>
    </div>

    <div class="ml-auto flex items-center gap-3">
      <div class="flex items-center rounded border border-[var(--st-header-group-border)]">
        <router-link
          v-slot="{ navigate, isActive }"
          :to="{ name: 'dashboard' }"
          custom
        >
          <button
            type="button"
            :class="navBtnClass(isActive, false)"
            title="总览"
            @click="navigate"
          >
            <LayoutDashboard class="w-3.5 h-3.5" />
            总览
          </button>
        </router-link>
        <router-link
          v-slot="{ navigate, isActive }"
          :to="{ name: 'kanban' }"
          custom
        >
          <button
            type="button"
            :class="navBtnClass(isActive, true)"
            title="看板"
            @click="navigate"
          >
            <LayoutGrid class="w-3.5 h-3.5" />
            看板
          </button>
        </router-link>
        <router-link
          v-slot="{ navigate, isActive }"
          :to="{ name: 'gantt' }"
          custom
        >
          <button
            type="button"
            :class="navBtnClass(isActive, true)"
            title="甘特图"
            @click="navigate"
          >
            <ChartGantt class="w-3.5 h-3.5" />
            甘特
          </button>
        </router-link>
      </div>

      <select
        class="appearance-none bg-[var(--st-header-filter-bg)] text-[var(--st-header-select-text)] text-sm pl-3 pr-8 py-1.5 rounded cursor-pointer hover:bg-[var(--st-header-filter-bg-hover)] transition-colors outline-none border border-[var(--st-header-group-border)] max-w-[7.5rem]"
        :value="themePreference"
        aria-label="主题"
        @change="onThemeChange"
      >
        <option value="light" class="bg-[var(--st-bg-elevated)] text-[var(--st-text-primary)]">
          浅色
        </option>
        <option value="dark" class="bg-[var(--st-bg-elevated)] text-[var(--st-text-primary)]">
          深色
        </option>
        <option value="system" class="bg-[var(--st-bg-elevated)] text-[var(--st-text-primary)]">
          跟随系统
        </option>
      </select>

      <div class="relative flex items-center min-w-[10rem] max-w-[14rem]">
        <Search
          class="w-4 h-4 text-[var(--st-header-icon-muted)] absolute left-2.5 pointer-events-none shrink-0"
        />
        <input
          v-model="searchDraft"
          type="search"
          class="w-full bg-[var(--st-header-filter-bg)] text-[var(--st-header-select-text)] text-sm pl-8 pr-2 py-1.5 rounded border border-[var(--st-header-group-border)] hover:bg-[var(--st-header-filter-bg-hover)] transition-colors outline-none placeholder:text-[var(--st-header-input-placeholder)]"
          placeholder="搜索标题、描述、标签…"
          aria-label="搜索任务"
          autocomplete="off"
          @input="onSearchInput"
        />
      </div>

      <div class="relative flex items-center">
        <ListFilter
          class="w-4 h-4 text-[var(--st-header-icon-muted)] absolute left-2.5 pointer-events-none"
        />
        <select
          class="appearance-none bg-[var(--st-header-filter-bg)] text-[var(--st-header-select-text)] text-sm pl-8 pr-6 py-1.5 rounded cursor-pointer hover:bg-[var(--st-header-filter-bg-hover)] transition-colors outline-none border-none"
          :value="filters.priority ?? ''"
          @change="emit('update:filters', 'priority', ($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="p in priorities"
            :key="p.value"
            :value="p.value"
            class="bg-[var(--st-bg-elevated)] text-[var(--st-text-primary)]"
          >
            {{ p.label }}
          </option>
        </select>
      </div>

      <button
        type="button"
        class="flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded transition-colors border border-[var(--st-header-group-border)] text-[var(--st-header-nav-text)] hover:bg-[var(--st-header-nav-hover)]"
        title="导出"
        @click="showExport = true"
      >
        <Download class="w-4 h-4" />
        导出
      </button>

      <button
        class="flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded transition-colors bg-[var(--st-header-create-bg)] text-[var(--st-header-create-text)] hover:bg-[var(--st-header-create-hover)]"
        @click="emit('create')"
      >
        <Plus class="w-4 h-4" />
        创建
      </button>
    </div>

    <ExportDialog v-if="showExport" :tasks="tasks" @close="showExport = false" />
  </header>
</template>
