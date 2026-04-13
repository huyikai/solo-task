<script setup lang="ts">
defineProps<{ label: string }>()

const colors = [
  'bg-[#DEEBFF] text-[#0747A6]',
  'bg-[#E3FCEF] text-[#006644]',
  'bg-[#FFF0B3] text-[#172B4D]',
  'bg-[#FFEBE6] text-[#BF2600]',
  'bg-[#EAE6FF] text-[#403294]',
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
