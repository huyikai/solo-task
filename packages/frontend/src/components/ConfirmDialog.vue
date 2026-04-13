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
      class="fixed inset-0 z-[60] flex items-start justify-center pt-[25vh] bg-black/50"
      @click.self="emit('cancel')"
    >
      <div class="bg-white rounded-sm shadow-lg w-full max-w-[420px]" @click.stop>
        <div class="p-5">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-[#FFEBE6] flex items-center justify-center shrink-0">
              <AlertTriangle class="w-5 h-5 text-[#DE350B]" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-[#172B4D]">
                {{ title ?? '确认删除' }}
              </h3>
              <p class="mt-1.5 text-sm text-[#5E6C84] leading-5">
                {{ message }}
              </p>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#DFE1E6]">
          <button
            class="px-4 py-2 text-sm text-[#172B4D] bg-[#F4F5F7] rounded-sm hover:bg-[#EBECF0] transition-colors font-medium"
            @click="emit('cancel')"
          >
            {{ cancelText ?? '取消' }}
          </button>
          <button
            class="px-4 py-2 text-sm text-white bg-[#DE350B] rounded-sm hover:bg-[#BF2600] transition-colors font-medium"
            @click="emit('confirm')"
          >
            {{ confirmText ?? '删除' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
