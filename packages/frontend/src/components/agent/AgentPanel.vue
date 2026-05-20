<script setup lang="ts">
import { ref, nextTick, watch, onMounted } from 'vue'
import { Send, Settings, Trash2, X } from 'lucide-vue-next'
import AgentMessage from './AgentMessage.vue'
import ActionPreviewList from './ActionPreviewList.vue'
import type { useAgent } from '../../composables/useAgent'

const props = defineProps<{
  agent: ReturnType<typeof useAgent>
  mobile?: boolean
}>()

const emit = defineEmits<{
  close: []
  'tasks-changed': []
}>()

const input = ref('')
const listRef = ref<HTMLElement | null>(null)
const confirming = ref(false)

const chips = ['列出所有紧急任务', '有哪些逾期任务？', '今日待办概览']

async function scrollToBottom() {
  await nextTick()
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
}

watch(
  () => props.agent.messages.value.length,
  () => scrollToBottom()
)

watch(
  () => props.agent.messages.value.map(m => m.content).join(''),
  () => scrollToBottom()
)

async function submit() {
  const text = input.value
  input.value = ''
  await props.agent.sendMessage(text)
  scrollToBottom()
}

function onChip(text: string) {
  input.value = text
  submit()
}

async function onConfirm(
  messageId: string,
  batchId: string,
  actionIds: string[],
  batchSessionId?: string
) {
  confirming.value = true
  try {
    await props.agent.confirmBatch(messageId, batchId, actionIds, batchSessionId)
    emit('tasks-changed')
  } finally {
    confirming.value = false
  }
}

function onCancelPending(messageId: string) {
  const msg = props.agent.messages.value.find(m => m.id === messageId)
  if (msg) msg.pendingBatch = undefined
}

onMounted(() => scrollToBottom())
</script>

<template>
  <aside
    class="flex h-full flex-col border-l border-[var(--st-border)] bg-[var(--st-bg-elevated)]"
    :class="mobile ? 'w-full' : 'w-[400px] shrink-0'"
  >
    <header
      class="flex shrink-0 items-center justify-between border-b border-[var(--st-border)] px-3 py-2"
    >
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-semibold text-[var(--st-text-primary)]">任务助手</h2>
        <span
          class="h-2 w-2 rounded-full"
          :class="{
            'bg-green-500': agent.connectionStatus.value === 'ok',
            'bg-gray-400': agent.connectionStatus.value === 'unknown',
            'bg-red-500': agent.connectionStatus.value === 'offline',
          }"
          :title="agent.connectionStatus.value"
        />
      </div>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded p-1.5 text-[var(--st-text-muted)] hover:bg-[var(--st-bg-subtle)]"
          title="设置"
          @click="agent.showSettings.value = true"
        >
          <Settings class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="rounded p-1.5 text-[var(--st-text-muted)] hover:bg-[var(--st-bg-subtle)]"
          title="清空对话"
          @click="agent.clearMessages()"
        >
          <Trash2 class="h-4 w-4" />
        </button>
        <button
          v-if="mobile"
          type="button"
          class="rounded p-1.5 text-[var(--st-text-muted)] hover:bg-[var(--st-bg-subtle)]"
          title="关闭"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </header>

    <div
      ref="listRef"
      class="flex-1 overflow-y-auto px-3 py-3 space-y-3"
    >
      <p
        v-if="agent.messages.value.length === 0"
        class="text-center text-sm text-[var(--st-text-muted)] py-8"
      >
        用自然语言管理任务，例如「创建明天截止的周报」
      </p>
      <template v-for="msg in agent.messages.value" :key="msg.id">
        <AgentMessage :message="msg">
          <ActionPreviewList
            v-if="msg.pendingBatch"
            :actions="msg.pendingBatch.actions"
            :confirming="confirming"
            @confirm="ids => onConfirm(msg.id, msg.pendingBatch!.batchId, ids, msg.pendingBatch!.sessionId)"
            @cancel="onCancelPending(msg.id)"
          />
        </AgentMessage>
      </template>
      <p v-if="agent.error.value" class="text-xs text-red-600 px-1">{{ agent.error.value }}</p>
    </div>

    <div class="shrink-0 border-t border-[var(--st-border)] p-2">
      <div class="mb-2 flex flex-wrap gap-1">
        <button
          v-for="chip in chips"
          :key="chip"
          type="button"
          class="rounded-full border border-[var(--st-border)] px-2 py-0.5 text-[10px] text-[var(--st-text-muted)] hover:border-[var(--st-accent)] hover:text-[var(--st-accent)]"
          :disabled="agent.loading.value"
          @click="onChip(chip)"
        >
          {{ chip }}
        </button>
      </div>
      <form class="flex gap-2" @submit.prevent="submit">
        <textarea
          v-model="input"
          rows="2"
          class="flex-1 resize-none rounded border border-[var(--st-border)] bg-[var(--st-bg-page)] px-2 py-1.5 text-sm text-[var(--st-text-primary)] outline-none focus:border-[var(--st-accent)]"
          placeholder="输入指令…"
          :disabled="agent.loading.value"
          @keydown.enter.exact.prevent="submit"
        />
        <button
          type="submit"
          class="self-end rounded bg-[var(--st-accent)] p-2 text-white hover:opacity-90 disabled:opacity-50"
          :disabled="agent.loading.value || !input.trim()"
        >
          <Send class="h-4 w-4" />
        </button>
      </form>
    </div>
  </aside>
</template>
