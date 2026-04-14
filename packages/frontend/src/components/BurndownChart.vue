<script setup lang="ts">
import { computed } from 'vue'
import type { BurndownDayPoint } from '../composables/useBurndownSeries'

const props = defineProps<{
  series: BurndownDayPoint[]
  weekLabel: string
  hasScopedTasks: boolean
}>()

const W = 320
const H = 180
const padL = 36
const padR = 12
const padT = 12
const padB = 28

const innerW = computed(() => W - padL - padR)
const innerH = computed(() => H - padT - padB)

function xForIndex(i: number): number {
  return padL + (innerW.value * (i + 0.5)) / 7
}

function yForValue(v: number, maxY: number): number {
  const m = Math.max(maxY, 1)
  return padT + innerH.value * (1 - v / m)
}

const maxY = computed(() => {
  let m = 1
  for (const p of props.series) {
    m = Math.max(m, p.ideal, p.actual ?? 0)
  }
  return m
})

const idealPoints = computed(() =>
  props.series.map((p, i) => `${xForIndex(i).toFixed(2)},${yForValue(p.ideal, maxY.value).toFixed(2)}`).join(' ')
)

const actualPoints = computed(() => {
  const pts: string[] = []
  for (let i = 0; i < props.series.length; i++) {
    const p = props.series[i]!
    if (p.actual === null) break
    pts.push(`${xForIndex(i).toFixed(2)},${yForValue(p.actual, maxY.value).toFixed(2)}`)
  }
  return pts.join(' ')
})

const yTicks = computed(() => {
  const m = maxY.value
  const step = m <= 5 ? 1 : Math.ceil(m / 5)
  const ticks: number[] = []
  for (let v = 0; v <= m; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] !== m) ticks.push(m)
  return ticks
})
</script>

<template>
  <div class="min-h-[200px] flex flex-col">
    <p class="text-xs text-[var(--st-text-muted)] mb-2">本周 {{ weekLabel }} · 截止日在本周内的任务</p>
    <div v-if="hasScopedTasks" class="flex-1 overflow-x-auto">
      <svg :viewBox="`0 0 ${W} ${H}`" class="w-full max-w-full h-[180px]" aria-hidden="true">
        <!-- grid -->
        <line
          v-for="t in yTicks"
          :key="'g' + t"
          :x1="padL"
          :y1="yForValue(t, maxY)"
          :x2="W - padR"
          :y2="yForValue(t, maxY)"
          stroke="var(--st-border-subtle)"
          stroke-width="1"
        />
        <polyline
          v-if="series.length"
          fill="none"
          stroke="var(--st-text-muted)"
          stroke-width="1.5"
          stroke-dasharray="4 3"
          :points="idealPoints"
        />
        <polyline
          v-if="actualPoints"
          fill="none"
          stroke="var(--st-accent)"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
          :points="actualPoints"
        />
        <g v-for="(p, i) in series" :key="'d' + i">
          <circle
            v-if="p.actual !== null"
            :cx="xForIndex(i)"
            :cy="yForValue(p.actual!, maxY)"
            r="3.5"
            fill="var(--st-accent)"
            stroke="var(--st-bg-surface)"
            stroke-width="1"
          />
        </g>
        <g v-for="(p, i) in series" :key="'x' + i">
          <text
            :x="xForIndex(i)"
            :y="H - 8"
            text-anchor="middle"
            class="fill-[var(--st-text-secondary)]"
            font-size="10"
          >
            {{ p.label }}
          </text>
        </g>
        <g v-for="t in yTicks" :key="'y' + t">
          <text :x="4" :y="yForValue(t, maxY) + 4" font-size="10" class="fill-[var(--st-text-muted)]">
            {{ t }}
          </text>
        </g>
      </svg>
    </div>
    <div v-else class="flex-1 flex items-center justify-center py-8">
      <p class="text-xs text-[var(--st-text-muted)] text-center">本周暂无截止任务，燃尽图将在有截止日落在本周的任务后显示</p>
    </div>
    <div v-if="hasScopedTasks" class="flex flex-wrap gap-4 mt-2 text-[10px] text-[var(--st-text-secondary)]">
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-0.5 bg-[var(--st-accent)] rounded" />
        实际剩余
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-0.5 border-t border-dashed border-[var(--st-text-muted)]" />
        理想剩余
      </span>
    </div>
  </div>
</template>
