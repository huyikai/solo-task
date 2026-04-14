<script setup lang="ts">
defineProps<{ label: string }>()

const colors = [
  'bg-[var(--st-tag-0-bg)] text-[var(--st-tag-0-fg)]',
  'bg-[var(--st-tag-1-bg)] text-[var(--st-tag-1-fg)]',
  'bg-[var(--st-tag-2-bg)] text-[var(--st-tag-2-fg)]',
  'bg-[var(--st-tag-3-bg)] text-[var(--st-tag-3-fg)]',
  'bg-[var(--st-tag-4-bg)] text-[var(--st-tag-4-fg)]',
]

function getColor(label: string) {
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
</script>

<template>
  <span
    class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-sm leading-4"
    :class="getColor(label)"
  >
    {{ label }}
  </span>
</template>
