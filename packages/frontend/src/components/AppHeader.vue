<script setup lang="ts">
import { Plus, ListFilter, LayoutDashboard, LayoutGrid, ChartGantt } from 'lucide-vue-next'

export type AppView = 'dashboard' | 'kanban' | 'gantt'

defineProps<{
  filters: Record<string, string>
  view: AppView
}>()

const emit = defineEmits<{
  'update:filters': [key: string, value: string]
  'update:view': [view: AppView]
  create: []
}>()

const priorities = [
  { value: '', label: '全部优先级' },
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]
</script>

<template>
  <header class="h-14 bg-[#0052CC] flex items-center px-6 shrink-0">
    <div class="flex items-center gap-2 text-white">
      <div class="w-7 h-7 bg-white/20 rounded flex items-center justify-center font-bold text-sm">
        S
      </div>
      <span class="text-lg font-semibold tracking-tight">solo-task</span>
    </div>

    <div class="ml-auto flex items-center gap-3">
      <div class="flex items-center rounded overflow-hidden border border-white/30">
        <button
          type="button"
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
          :class="view === 'dashboard' ? 'bg-white text-[#0052CC]' : 'text-white/90 hover:bg-white/10'"
          title="总览"
          @click="emit('update:view', 'dashboard')"
        >
          <LayoutDashboard class="w-3.5 h-3.5" />
          总览
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-white/30"
          :class="view === 'kanban' ? 'bg-white text-[#0052CC]' : 'text-white/90 hover:bg-white/10'"
          title="看板"
          @click="emit('update:view', 'kanban')"
        >
          <LayoutGrid class="w-3.5 h-3.5" />
          看板
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-white/30"
          :class="view === 'gantt' ? 'bg-white text-[#0052CC]' : 'text-white/90 hover:bg-white/10'"
          title="甘特图"
          @click="emit('update:view', 'gantt')"
        >
          <ChartGantt class="w-3.5 h-3.5" />
          甘特
        </button>
      </div>

      <div class="relative flex items-center">
        <ListFilter class="w-4 h-4 text-white/70 absolute left-2.5 pointer-events-none" />
        <select
          class="appearance-none bg-white/15 text-white text-sm pl-8 pr-6 py-1.5 rounded cursor-pointer hover:bg-white/25 transition-colors outline-none border-none"
          :value="filters.priority ?? ''"
          @change="emit('update:filters', 'priority', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="p in priorities" :key="p.value" :value="p.value" class="text-[#172B4D]">
            {{ p.label }}
          </option>
        </select>
      </div>

      <button
        class="flex items-center gap-1.5 bg-white text-[#0052CC] text-sm font-medium px-3.5 py-1.5 rounded hover:bg-blue-50 transition-colors"
        @click="emit('create')"
      >
        <Plus class="w-4 h-4" />
        创建
      </button>
    </div>
  </header>
</template>
