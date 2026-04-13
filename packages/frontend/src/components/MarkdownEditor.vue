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
  if (!props.modelValue) return '<p class="text-[#6B778C] text-sm italic">暂无内容</p>'
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

const toolbarGroups: Array<Array<{
  title: string
  action: () => void
  icon: string
}>> = [
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
  <div class="border border-[#DFE1E6] rounded-sm overflow-hidden">
    <!-- Tab bar + toolbar -->
    <div class="flex items-stretch bg-[#F4F5F7] border-b border-[#DFE1E6]">
      <!-- Write / Preview tabs -->
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-r border-[#DFE1E6] transition-colors"
        :class="mode === 'write'
          ? 'bg-white text-[#0052CC] border-b-2 border-b-[#0052CC] -mb-px'
          : 'text-[#6B778C] hover:text-[#172B4D]'"
        @click="mode = 'write'"
      >
        编辑
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-r border-[#DFE1E6] transition-colors"
        :class="mode === 'preview'
          ? 'bg-white text-[#0052CC] border-b-2 border-b-[#0052CC] -mb-px'
          : 'text-[#6B778C] hover:text-[#172B4D]'"
        @click="mode = 'preview'"
      >
        预览
      </button>

      <!-- Toolbar (only visible in write mode) -->
      <div v-if="mode === 'write'" class="flex items-center gap-0.5 px-2">
        <template v-for="(group, gi) in toolbarGroups" :key="gi">
          <div v-if="gi > 0" class="w-px h-4 bg-[#DFE1E6] mx-1" />
          <button
            v-for="btn in group"
            :key="btn.title"
            type="button"
            :title="btn.title"
            class="flex items-center justify-center w-7 h-7 rounded text-[#44546F] text-xs font-bold hover:bg-[#DFE1E6] transition-colors select-none"
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
      class="w-full px-3 py-2.5 text-sm text-[#172B4D] font-mono outline-none resize-y bg-white placeholder:text-[#8993A4]"
      :placeholder="placeholder ?? '支持 Markdown 格式，如 **粗体**、## 标题、- 列表...'"
      @input="updateValue(($event.target as HTMLTextAreaElement).value)"
    />

    <!-- Preview area -->
    <div
      v-else
      class="prose prose-sm max-w-none px-3 py-2.5 min-h-[12rem] bg-white text-[#172B4D] overflow-auto"
      v-html="rendered"
    />
  </div>
</template>
