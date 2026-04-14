<script setup lang="ts">
import { computed } from 'vue'
import type { TaskStatus } from '../types/task'

const props = defineProps<{
  byStatus: Record<TaskStatus, number>
  statusMeta: { key: TaskStatus; label: string; color: string }[]
}>()

const R = 42
const CX = 50
const CY = 50

type Slice = {
  key: TaskStatus
  label: string
  color: string
  count: number
  d: string
}

function arcPath(startAngle: number, sweep: number): string {
  if (sweep <= 0 || sweep >= Math.PI * 2 - 1e-9) {
    // 整圆
    const x0 = CX + R * Math.cos(startAngle)
    const y0 = CY + R * Math.sin(startAngle)
    return `M ${CX} ${CY} L ${x0.toFixed(3)} ${y0.toFixed(3)} A ${R} ${R} 0 1 1 ${x0.toFixed(3)} ${(y0 + 0.001).toFixed(3)} Z`
  }
  const x0 = CX + R * Math.cos(startAngle)
  const y0 = CY + R * Math.sin(startAngle)
  const x1 = CX + R * Math.cos(startAngle + sweep)
  const y1 = CY + R * Math.sin(startAngle + sweep)
  const large = sweep > Math.PI ? 1 : 0
  return `M ${CX} ${CY} L ${x0.toFixed(3)} ${y0.toFixed(3)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(3)} ${y1.toFixed(3)} Z`
}

const slices = computed((): Slice[] => {
  const total = props.statusMeta.reduce((s, m) => s + props.byStatus[m.key], 0)
  if (total === 0) return []
  let angle = -Math.PI / 2
  const out: Slice[] = []
  for (const m of props.statusMeta) {
    const count = props.byStatus[m.key]
    if (count <= 0) continue
    const sweep = (count / total) * Math.PI * 2
    out.push({
      key: m.key,
      label: m.label,
      color: m.color,
      count,
      d: arcPath(angle, sweep),
    })
    angle += sweep
  }
  return out
})

const total = computed(() => props.statusMeta.reduce((s, m) => s + props.byStatus[m.key], 0))
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center gap-6 min-h-[200px]">
    <div class="shrink-0 flex items-center justify-center w-44 h-44">
      <svg v-if="total > 0" viewBox="0 0 100 100" class="w-full h-full" aria-hidden="true">
        <circle
          v-if="slices.length === 1"
          :cx="CX"
          :cy="CY"
          :r="R"
          :fill="slices[0]!.color"
          stroke="var(--st-bg-surface)"
          stroke-width="1"
        >
          <title>{{ slices[0]!.label }} {{ slices[0]!.count }}（100%）</title>
        </circle>
        <template v-else>
          <path
            v-for="sl in slices"
            :key="sl.key"
            :d="sl.d"
            :fill="sl.color"
            stroke="var(--st-bg-surface)"
            stroke-width="1"
            class="transition-opacity hover:opacity-90"
          >
            <title>{{ sl.label }} {{ sl.count }}（{{ Math.round((sl.count / total) * 1000) / 10 }}%）</title>
          </path>
        </template>
      </svg>
      <p v-else class="text-xs text-[var(--st-text-muted)] text-center px-2">暂无任务数据</p>
    </div>
    <div class="flex-1 min-w-0 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--st-text-secondary)]">
      <span v-for="m in statusMeta" :key="m.key" class="flex items-center gap-1.5">
        <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ backgroundColor: m.color }" />
        <span class="text-[var(--st-text-primary)]">{{ m.label }}</span>
        <span class="tabular-nums">{{ byStatus[m.key] }}</span>
      </span>
    </div>
  </div>
</template>
