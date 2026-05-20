<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import type { AgentMessage } from '../../types/agent'

const props = defineProps<{
  message: AgentMessage
}>()

const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  'in-progress': '进行中',
  done: '已完成',
  archived: '归档',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
}

const html = computed(() => {
  if (props.message.role === 'user') return null
  const raw = props.message.content || (props.message.streaming ? '…' : '')
  if (!raw) return null
  return marked.parse(raw, { async: false }) as string
})

const hasToolList = computed(() =>
  props.message.toolResults?.some(tr => tr.items && tr.items.length > 0)
)
</script>

<template>
  <div
    :class="[
      'max-w-[95%] rounded-lg px-3 py-2 text-sm',
      message.role === 'user'
        ? 'ml-auto bg-[var(--st-accent)] text-white'
        : 'mr-auto bg-[var(--st-bg-subtle)] text-[var(--st-text-primary)] border border-[var(--st-border)]',
    ]"
  >
    <p v-if="message.role === 'user'" class="whitespace-pre-wrap">{{ message.content }}</p>
    <div
      v-else-if="html"
      class="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1"
      v-html="html"
    />
    <p
      v-else-if="message.streaming && !hasToolList"
      class="text-[var(--st-text-muted)]"
    >
      思考中…
    </p>

    <div
      v-if="message.toolResults?.length"
      class="mt-2 space-y-2 border-t border-[var(--st-border)] pt-2"
    >
      <details
        v-for="(tr, i) in message.toolResults"
        :key="i"
        class="text-xs text-[var(--st-text-muted)]"
        :open="Boolean(tr.items?.length && tr.items.length <= 8)"
      >
        <summary class="cursor-pointer hover:text-[var(--st-text-secondary)]">
          {{ tr.summary }}
        </summary>
        <ul
          v-if="tr.items?.length"
          class="mt-1.5 max-h-52 space-y-1 overflow-y-auto pl-1"
        >
          <li
            v-for="item in tr.items"
            :key="item.id"
            class="rounded border border-[var(--st-border)] bg-[var(--st-bg-page)] px-2 py-1 text-[var(--st-text-primary)]"
          >
            <span class="font-medium">{{ item.title }}</span>
            <span class="text-[var(--st-text-muted)]">
              · {{ STATUS_LABELS[item.status] ?? item.status }}
              · {{ PRIORITY_LABELS[item.priority] ?? item.priority }}
              <template v-if="item.dueDate">
                · 截止 {{ item.dueDate.slice(0, 10) }}
              </template>
            </span>
          </li>
        </ul>
      </details>
    </div>

    <slot />
  </div>
</template>
