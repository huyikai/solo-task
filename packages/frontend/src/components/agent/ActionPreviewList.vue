<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Check, X, ChevronDown } from 'lucide-vue-next'
import type { PendingActionPreview } from '../../types/agent'

const props = defineProps<{
  actions: PendingActionPreview[]
  confirming?: boolean
}>()

const emit = defineEmits<{
  confirm: [actionIds: string[]]
  cancel: []
}>()

const selected = ref<Set<string>>(new Set())

watch(
  () => props.actions,
  actions => {
    selected.value = new Set(actions.map(a => a.id))
  },
  { immediate: true }
)

const selectedCount = computed(() => selected.value.size)

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function confirm() {
  emit('confirm', [...selected.value])
}

const expanded = ref<Record<string, boolean>>({})

function toggleDiff(id: string) {
  expanded.value[id] = !expanded.value[id]
}
</script>

<template>
  <div
    class="mt-2 rounded-md border border-[var(--st-accent)]/30 bg-[var(--st-bg-elevated)] p-2"
  >
    <p class="mb-2 text-xs font-medium text-[var(--st-text-secondary)]">
      待确认操作（{{ actions.length }}）
    </p>
    <ul class="space-y-1.5">
      <li
        v-for="action in actions"
        :key="action.id"
        class="rounded border border-[var(--st-border)] bg-[var(--st-bg-page)] p-2"
      >
        <label class="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            class="mt-0.5"
            :checked="selected.has(action.id)"
            @change="toggle(action.id)"
          />
          <span class="flex-1 text-sm text-[var(--st-text-primary)]">{{ action.summary }}</span>
        </label>
        <button
          type="button"
          class="mt-1 flex items-center gap-0.5 text-xs text-[var(--st-text-muted)] hover:text-[var(--st-accent)]"
          @click="toggleDiff(action.id)"
        >
          <ChevronDown
            class="h-3 w-3 transition-transform"
            :class="expanded[action.id] ? 'rotate-180' : ''"
          />
          详情
        </button>
        <pre
          v-if="expanded[action.id]"
          class="mt-1 max-h-24 overflow-auto rounded bg-[var(--st-bg-subtle)] p-1.5 text-[10px] text-[var(--st-text-muted)]"
        >{{ JSON.stringify(action.diff, null, 2) }}</pre>
      </li>
    </ul>
    <div class="mt-2 flex gap-2">
      <button
        type="button"
        class="flex flex-1 items-center justify-center gap-1 rounded bg-[var(--st-accent)] px-2 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        :disabled="confirming || selectedCount === 0"
        @click="confirm"
      >
        <Check class="h-3.5 w-3.5" />
        确认执行 ({{ selectedCount }})
      </button>
      <button
        type="button"
        class="flex items-center justify-center gap-1 rounded border border-[var(--st-border)] px-2 py-1.5 text-xs text-[var(--st-text-secondary)] hover:bg-[var(--st-bg-subtle)]"
        :disabled="confirming"
        @click="emit('cancel')"
      >
        <X class="h-3.5 w-3.5" />
        取消
      </button>
    </div>
  </div>
</template>
