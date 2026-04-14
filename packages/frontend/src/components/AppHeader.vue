<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  Plus,
  ListFilter,
  LayoutDashboard,
  SquareKanban,
  ChartGantt,
  Download,
  Search,
  Palette,
} from 'lucide-vue-next'
import { useTheme, type ThemePreference } from '../composables/useTheme'
import type { Task } from '../types/task'
import ExportDialog from './ExportDialog.vue'

const props = defineProps<{
  filters: Record<string, string>
  tasks: Task[]
}>()

const showExport = ref(false)
const mobileSearchOpen = ref(false)

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

const isMdUp = ref(true)
let mqCleanup: (() => void) | null = null

onMounted(() => {
  const mq = window.matchMedia('(min-width: 768px)')
  isMdUp.value = mq.matches
  const handler = () => {
    isMdUp.value = mq.matches
    if (mq.matches) mobileSearchOpen.value = false
  }
  mq.addEventListener('change', handler)
  mqCleanup = () => mq.removeEventListener('change', handler)
})

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
  mqCleanup?.()
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
    'box-border flex h-full min-h-0 h-8 min-h-8 items-center justify-center gap-1.5 px-3 text-sm font-medium transition-colors'
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
      'bg-transparent text-[var(--st-accent)] border-b-2 border-[var(--st-accent)] rounded-none pb-0',
    ].join(' ')
  }
  return [base, border, 'bg-[var(--st-header-nav-active-bg)] text-[var(--st-header-nav-active-text)]'].join(
    ' '
  )
}

const secondaryBtnClass =
  'flex h-8 min-h-8 items-center gap-1.5 rounded border border-[var(--st-header-group-border)] px-2.5 text-sm font-medium text-[var(--st-header-nav-text)] transition-colors hover:bg-[var(--st-header-nav-hover)]'
</script>

<template>
  <header
    class="relative z-20 shrink-0 border-b border-[var(--st-border)] bg-[var(--st-header-bg)] px-4 py-2 sm:px-6 md:py-2"
  >
    <!-- md+：三列网格，中间为「视图 | 分割线 | 筛选」整体居中 -->
    <div
      class="hidden min-h-8 items-center gap-x-3 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-x-4"
    >
      <div class="flex min-w-0 items-center gap-2 justify-self-start">
        <div
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--st-header-logo-bg)] text-sm font-bold text-[var(--st-header-title)]"
        >
          S
        </div>
        <span class="text-lg font-semibold tracking-tight text-[var(--st-header-title)]">solo-task</span>
      </div>

      <div
        class="flex min-w-0 max-w-full items-stretch justify-center justify-self-center"
      >
        <div
          class="flex items-stretch overflow-hidden rounded border border-[var(--st-header-group-border)]"
        >
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
              <LayoutDashboard class="h-4 w-4 shrink-0" />
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
              <SquareKanban class="h-4 w-4 shrink-0" />
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
              <ChartGantt class="h-4 w-4 shrink-0" />
              甘特
            </button>
          </router-link>
        </div>

        <!-- 中间分割线：连接两段 -->
        <div
          class="mx-2 w-px shrink-0 self-stretch bg-[var(--st-header-group-border)] md:mx-3"
          aria-hidden="true"
        />

        <div
          class="flex min-w-0 max-w-[min(28rem,38vw)] items-stretch overflow-hidden rounded-md border border-[var(--st-header-group-border)] bg-[var(--st-header-filter-bg)]"
        >
          <div class="relative flex min-w-0 flex-1 items-center py-0 pl-2">
            <Search
              class="pointer-events-none absolute left-2.5 h-3.5 w-3.5 shrink-0 text-[var(--st-header-icon-muted)]"
            />
            <input
              v-model="searchDraft"
              type="search"
              :class="`w-full min-w-0 border-0 bg-transparent py-0 pl-7 pr-2 text-sm leading-none text-[var(--st-header-select-text)] outline-none ring-0 placeholder:text-[var(--st-header-input-placeholder)] focus-visible:ring-2 focus-visible:ring-[var(--st-focus)] focus-visible:ring-offset-0 h-8 min-h-8`"
              placeholder="搜索标题、描述、标签…"
              aria-label="搜索任务"
              autocomplete="off"
              @input="onSearchInput"
            />
          </div>

          <div
            class="w-px shrink-0 self-stretch bg-[var(--st-header-group-border)]"
            aria-hidden="true"
          />

          <div class="relative flex shrink-0 items-center pr-1">
            <ListFilter
              class="pointer-events-none absolute left-2 h-3.5 w-3.5 text-[var(--st-header-icon-muted)]"
            />
            <select
              :class="`max-w-[10rem] cursor-pointer appearance-none rounded-sm border-0 bg-transparent py-0 pl-7 pr-4 text-sm leading-none text-[var(--st-header-select-text)] outline-none transition-colors hover:bg-[var(--st-header-filter-bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--st-focus)] focus-visible:ring-offset-0 h-8 min-h-8`"
              :value="filters.priority ?? ''"
              aria-label="按优先级筛选"
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
        </div>
      </div>

      <div class="flex min-w-0 shrink-0 items-center justify-end justify-self-end gap-2">
        <div :class="[secondaryBtnClass, 'pl-1.5 pr-1']">
          <Palette
            class="h-4 w-4 shrink-0 text-[var(--st-header-icon-muted)]"
            aria-hidden="true"
          />
          <select
            class="max-w-[6.5rem] cursor-pointer appearance-none border-0 bg-transparent py-0.5 pl-0.5 pr-6 text-sm text-[var(--st-header-select-text)] outline-none"
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
        </div>

        <button
          type="button"
          :class="secondaryBtnClass"
          title="导出"
          @click="showExport = true"
        >
          <Download class="h-4 w-4" />
          导出
        </button>

        <button
          :class="`flex items-center gap-1.5 rounded px-3.5 text-sm font-medium transition-colors bg-[var(--st-header-create-bg)] text-[var(--st-header-create-text)] hover:bg-[var(--st-header-create-hover)] h-8 min-h-8`"
          type="button"
          @click="emit('create')"
        >
          <Plus class="h-4 w-4" />
          创建
        </button>
      </div>
    </div>

    <!-- 窄屏：品牌 + 操作 / 中间区 / 展开搜索 -->
    <div class="flex flex-col gap-2 md:hidden">
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <div
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--st-header-logo-bg)] text-sm font-bold text-[var(--st-header-title)]"
          >
            S
          </div>
          <span class="text-lg font-semibold tracking-tight text-[var(--st-header-title)]">solo-task</span>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <div :class="[secondaryBtnClass, 'pl-1.5 pr-1']">
            <Palette
              class="h-4 w-4 shrink-0 text-[var(--st-header-icon-muted)]"
              aria-hidden="true"
            />
            <select
              class="max-w-[5.5rem] cursor-pointer appearance-none border-0 bg-transparent py-0.5 pl-0.5 pr-5 text-sm text-[var(--st-header-select-text)] outline-none"
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
          </div>
          <button
            type="button"
            :class="secondaryBtnClass"
            title="导出"
            @click="showExport = true"
          >
            <Download class="h-4 w-4" />
            导出
          </button>
          <button
            :class="`flex items-center gap-1 rounded px-2.5 text-sm font-medium transition-colors bg-[var(--st-header-create-bg)] text-[var(--st-header-create-text)] hover:bg-[var(--st-header-create-hover)] h-8 min-h-8`"
            type="button"
            @click="emit('create')"
          >
            <Plus class="h-4 w-4" />
            创建
          </button>
        </div>
      </div>

      <div class="flex items-stretch justify-center">
        <div
          class="flex w-full max-w-md items-stretch overflow-hidden rounded border border-[var(--st-header-group-border)]"
        >
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
              <LayoutDashboard class="h-4 w-4 shrink-0" />
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
              <SquareKanban class="h-4 w-4 shrink-0" />
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
              <ChartGantt class="h-4 w-4 shrink-0" />
              甘特
            </button>
          </router-link>
        </div>

        <div
          class="mx-2 w-px shrink-0 self-stretch bg-[var(--st-header-group-border)]"
          aria-hidden="true"
        />

        <div
          class="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-[var(--st-header-group-border)] bg-[var(--st-header-filter-bg)]"
        >
          <div class="flex shrink-0 items-center py-0 pl-1">
            <button
              type="button"
              :class="[
                secondaryBtnClass,
                'border-0 px-2',
                mobileSearchOpen ? 'bg-[var(--st-header-filter-bg-hover)]' : '',
              ]"
              aria-label="展开搜索"
              :aria-expanded="mobileSearchOpen"
              @click="mobileSearchOpen = !mobileSearchOpen"
            >
              <Search class="h-4 w-4" />
            </button>
          </div>

          <div
            class="w-px shrink-0 self-stretch bg-[var(--st-header-group-border)]"
            aria-hidden="true"
          />

          <div class="relative flex min-w-0 shrink-0 items-center pr-1">
            <ListFilter
              class="pointer-events-none absolute left-2 h-3.5 w-3.5 text-[var(--st-header-icon-muted)]"
            />
            <select
              :class="`min-w-0 max-w-[9rem] flex-1 cursor-pointer appearance-none rounded-sm border-0 bg-transparent py-0 pl-7 pr-3 text-sm leading-none text-[var(--st-header-select-text)] outline-none transition-colors hover:bg-[var(--st-header-filter-bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--st-focus)] focus-visible:ring-offset-0 h-8 min-h-8`"
              :value="filters.priority ?? ''"
              aria-label="按优先级筛选"
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
        </div>
      </div>

      <div
        v-show="mobileSearchOpen"
        class="w-full rounded-md border border-[var(--st-header-group-border)] bg-[var(--st-header-filter-bg)] px-2 py-1"
      >
        <div class="relative flex items-center">
          <Search
            class="pointer-events-none h-3.5 w-3.5 shrink-0 text-[var(--st-header-icon-muted)]"
          />
          <input
            v-model="searchDraft"
            type="search"
            :class="`w-full border-0 bg-transparent py-1.5 pl-2 pr-2 text-sm text-[var(--st-header-select-text)] outline-none placeholder:text-[var(--st-header-input-placeholder)] h-8 min-h-8`"
            placeholder="搜索标题、描述、标签…"
            aria-label="搜索任务"
            autocomplete="off"
            @input="onSearchInput"
          />
        </div>
      </div>
    </div>

    <ExportDialog v-if="showExport" :tasks="tasks" @close="showExport = false" />
  </header>
</template>
