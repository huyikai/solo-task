<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'

defineProps<{
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex items-start justify-center pt-[25vh] bg-[var(--st-shadow-overlay)]"
      @click.self="emit('cancel')"
    >
      <div
        class="bg-[var(--st-bg-elevated)] rounded-sm shadow-lg w-full max-w-[420px] border border-[var(--st-border)]"
        @click.stop
      >
        <div class="p-5">
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-full bg-[var(--st-confirm-icon-bg)] flex items-center justify-center shrink-0"
            >
              <AlertTriangle class="w-5 h-5 text-[var(--st-danger)]" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-[var(--st-text-primary)]">
                {{ title ?? '确认删除' }}
              </h3>
              <p class="mt-1.5 text-sm text-[var(--st-text-secondary)] leading-5">
                {{ message }}
              </p>
            </div>
          </div>
        </div>
        <div
          class="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--st-border)]"
        >
          <button
            class="px-4 py-2 text-sm text-[var(--st-text-primary)] bg-[var(--st-bg-muted)] rounded-sm hover:bg-[var(--st-bg-muted-strong)] transition-colors font-medium"
            @click="emit('cancel')"
          >
            {{ cancelText ?? '取消' }}
          </button>
          <button
            class="px-4 py-2 text-sm text-white bg-[var(--st-danger)] rounded-sm hover:bg-[var(--st-danger-hover)] transition-colors font-medium"
            @click="emit('confirm')"
          >
            {{ confirmText ?? '删除' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
