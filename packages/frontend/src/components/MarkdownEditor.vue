<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  rows?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const mode = ref<'write' | 'preview'>('write')
const textarea = ref<HTMLTextAreaElement | null>(null)

const rendered = computed(() => {
  if (!props.modelValue) {
    return '<p class="text-[var(--st-text-muted)] text-sm italic">暂无内容</p>'
  }
  return marked.parse(props.modelValue) as string
})

function updateValue(val: string) {
  emit('update:modelValue', val)
}

type WrapAction = { before: string; after: string; placeholder: string }
type LineAction = { prefix: string; placeholder: string }

function applyWrap({ before, after, placeholder }: WrapAction) {
  const el = textarea.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const selected = el.value.slice(start, end) || placeholder
  const newVal = el.value.slice(0, start) + before + selected + after + el.value.slice(end)
  updateValue(newVal)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + before.length, start + before.length + selected.length)
  })
}

function applyLine({ prefix, placeholder }: LineAction) {
  const el = textarea.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const val = el.value
  const lineStart = val.lastIndexOf('\n', start - 1) + 1
  const selected = val.slice(start, end) || placeholder
  const newVal = val.slice(0, lineStart) + prefix + val.slice(lineStart, start) + selected + val.slice(end)
  updateValue(newVal)
  requestAnimationFrame(() => {
    el.focus()
    const ns = lineStart + prefix.length + (start - lineStart)
    el.setSelectionRange(ns, ns + selected.length)
  })
}

const toolbarGroups: Array<
  Array<{
    title: string
    action: () => void
    icon: string
  }>
> = [
  [
    {
      title: '标题',
      icon: 'H',
      action: () => applyLine({ prefix: '## ', placeholder: '标题' }),
    },
    {
      title: '粗体',
      icon: 'B',
      action: () => applyWrap({ before: '**', after: '**', placeholder: '粗体文字' }),
    },
    {
      title: '斜体',
      icon: 'I',
      action: () => applyWrap({ before: '_', after: '_', placeholder: '斜体文字' }),
    },
  ],
  [
    {
      title: '有序列表',
      icon: '1≡',
      action: () => applyLine({ prefix: '1. ', placeholder: '列表项' }),
    },
    {
      title: '无序列表',
      icon: '≡',
      action: () => applyLine({ prefix: '- ', placeholder: '列表项' }),
    },
    {
      title: '任务列表',
      icon: '☑',
      action: () => applyLine({ prefix: '- [ ] ', placeholder: '任务项' }),
    },
  ],
  [
    {
      title: '行内代码',
      icon: '<>',
      action: () => applyWrap({ before: '`', after: '`', placeholder: '代码' }),
    },
    {
      title: '引用',
      icon: '❝',
      action: () => applyLine({ prefix: '> ', placeholder: '引用内容' }),
    },
    {
      title: '链接',
      icon: '🔗',
      action: () => applyWrap({ before: '[', after: '](url)', placeholder: '链接文字' }),
    },
  ],
]
</script>

<template>
  <div class="border border-[var(--st-border)] rounded-sm overflow-hidden">
    <!-- Tab bar + toolbar -->
    <div class="flex items-stretch bg-[var(--st-bg-toolbar)] border-b border-[var(--st-border)]">
      <!-- Write / Preview tabs -->
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-r border-[var(--st-border)] transition-colors"
        :class="
          mode === 'write'
            ? 'bg-[var(--st-bg-surface)] text-[var(--st-accent)] border-b-2 border-b-[var(--st-accent)] -mb-px'
            : 'text-[var(--st-text-muted)] hover:text-[var(--st-text-primary)]'
        "
        @click="mode = 'write'"
      >
        编辑
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-r border-[var(--st-border)] transition-colors"
        :class="
          mode === 'preview'
            ? 'bg-[var(--st-bg-surface)] text-[var(--st-accent)] border-b-2 border-b-[var(--st-accent)] -mb-px'
            : 'text-[var(--st-text-muted)] hover:text-[var(--st-text-primary)]'
        "
        @click="mode = 'preview'"
      >
        预览
      </button>

      <!-- Toolbar (only visible in write mode) -->
      <div v-if="mode === 'write'" class="flex items-center gap-0.5 px-2">
        <template v-for="(group, gi) in toolbarGroups" :key="gi">
          <div v-if="gi > 0" class="w-px h-4 bg-[var(--st-border)] mx-1" />
          <button
            v-for="btn in group"
            :key="btn.title"
            type="button"
            :title="btn.title"
            class="flex items-center justify-center w-7 h-7 rounded text-[var(--st-text-toolbar)] text-xs font-bold hover:bg-[var(--st-border)] transition-colors select-none"
            :class="btn.icon === 'I' ? 'italic' : ''"
            @click="btn.action"
          >
            {{ btn.icon }}
          </button>
        </template>
      </div>
    </div>

    <!-- Write area -->
    <textarea
      v-if="mode === 'write'"
      ref="textarea"
      :value="modelValue"
      :rows="rows ?? 8"
      class="w-full px-3 py-2.5 text-sm text-[var(--st-text-primary)] font-mono outline-none resize-y bg-[var(--st-bg-surface)] placeholder:text-[var(--st-text-placeholder)]"
      :placeholder="placeholder ?? '支持 Markdown 格式，如 **粗体**、## 标题、- 列表...'"
      @input="updateValue(($event.target as HTMLTextAreaElement).value)"
    />

    <!-- Preview area -->
    <div
      v-else
      class="st-markdown-preview prose prose-sm max-w-none px-3 py-2.5 min-h-[12rem] bg-[var(--st-bg-surface)] text-[var(--st-text-primary)] overflow-auto"
      v-html="rendered"
    />
  </div>
</template>
