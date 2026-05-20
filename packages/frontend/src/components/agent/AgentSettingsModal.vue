<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { X, RefreshCw } from 'lucide-vue-next'
import type { AgentConfig, AgentHealth, AgentProviderId } from '../../types/agent'

const props = defineProps<{
  config: AgentConfig | null
  health: AgentHealth | null
}>()

const emit = defineEmits<{
  close: []
  save: [
    patch: {
      provider?: AgentProviderId
      ollama?: Partial<AgentConfig['ollama']>
      openaiCompat?: Partial<AgentConfig['openaiCompat']>
    },
  ]
  refresh: []
}>()

const provider = ref<AgentProviderId>('ollama')
const ollamaBaseUrl = ref('http://127.0.0.1:11434')
const ollamaModel = ref('llama3.2')
const openaiBaseUrl = ref('https://api.openai.com/v1')
const openaiModel = ref('gpt-4o-mini')
const openaiApiKey = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.config,
  c => {
    if (!c) return
    provider.value = c.provider
    ollamaBaseUrl.value = c.ollama.baseUrl
    ollamaModel.value = c.ollama.model
    openaiBaseUrl.value = c.openaiCompat.baseUrl
    openaiModel.value = c.openaiCompat.model
    openaiApiKey.value = ''
  },
  { immediate: true }
)

const ollamaModels = ref<string[]>([])

watch(
  () => props.health,
  h => {
    ollamaModels.value = h?.ollama.models ?? []
  },
  { immediate: true }
)

async function handleSave() {
  saving.value = true
  error.value = null
  try {
    const patch: {
      provider?: AgentProviderId
      ollama?: Partial<AgentConfig['ollama']>
      openaiCompat?: Partial<AgentConfig['openaiCompat']>
    } = {
      provider: provider.value,
      ollama: {
        baseUrl: ollamaBaseUrl.value,
        model: ollamaModel.value,
      },
      openaiCompat: {
        baseUrl: openaiBaseUrl.value,
        model: openaiModel.value,
      },
    }
    if (openaiApiKey.value.trim()) {
      patch.openaiCompat!.apiKey = openaiApiKey.value.trim()
    }
    emit('save', patch)
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  emit('refresh')
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="emit('close')"
    >
      <div
        class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--st-border)] bg-[var(--st-bg-elevated)] shadow-xl"
        role="dialog"
        aria-labelledby="agent-settings-title"
      >
        <div
          class="flex items-center justify-between border-b border-[var(--st-border)] px-4 py-3"
        >
          <h2 id="agent-settings-title" class="text-lg font-semibold text-[var(--st-text-primary)]">
            智能体设置
          </h2>
          <button
            type="button"
            class="rounded p-1 text-[var(--st-text-muted)] hover:bg-[var(--st-bg-subtle)]"
            @click="emit('close')"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="space-y-4 p-4">
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

          <fieldset>
            <legend class="mb-2 text-sm font-medium text-[var(--st-text-secondary)]">
              提供商
            </legend>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-sm">
                <input v-model="provider" type="radio" value="ollama" />
                Ollama（本地）
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input v-model="provider" type="radio" value="openai_compat" />
                OpenAI 兼容 API
              </label>
            </div>
          </fieldset>

          <div
            v-if="health"
            class="flex items-center gap-2 rounded border border-[var(--st-border)] bg-[var(--st-bg-subtle)] px-3 py-2 text-xs"
          >
            <span
              class="h-2 w-2 rounded-full"
              :class="
                provider === 'ollama'
                  ? health.ollama.ok
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : health.openai_compat.ok
                    ? 'bg-green-500'
                    : 'bg-red-500'
              "
            />
            <span class="text-[var(--st-text-muted)]">
              {{
                provider === 'ollama'
                  ? health.ollama.ok
                    ? 'Ollama 已连接'
                    : `Ollama: ${health.ollama.error ?? '离线'}`
                  : health.openai_compat.ok
                    ? 'API 已连接'
                    : `API: ${health.openai_compat.error ?? '离线'}`
              }}
            </span>
            <button
              type="button"
              class="ml-auto text-[var(--st-accent)] hover:underline"
              @click="emit('refresh')"
            >
              <RefreshCw class="inline h-3 w-3" />
              检测
            </button>
          </div>

          <template v-if="provider === 'ollama'">
            <label class="block text-sm">
              <span class="text-[var(--st-text-secondary)]">Ollama 地址</span>
              <input
                v-model="ollamaBaseUrl"
                type="url"
                class="mt-1 w-full rounded border border-[var(--st-border)] bg-[var(--st-bg-page)] px-2 py-1.5 text-sm"
              />
            </label>
            <label class="block text-sm">
              <span class="text-[var(--st-text-secondary)]">模型</span>
              <input
                v-model="ollamaModel"
                type="text"
                list="ollama-models"
                class="mt-1 w-full rounded border border-[var(--st-border)] bg-[var(--st-bg-page)] px-2 py-1.5 text-sm"
              />
              <datalist id="ollama-models">
                <option v-for="m in ollamaModels" :key="m" :value="m" />
              </datalist>
            </label>
          </template>

          <template v-else>
            <label class="block text-sm">
              <span class="text-[var(--st-text-secondary)]">API Base URL</span>
              <input
                v-model="openaiBaseUrl"
                type="url"
                class="mt-1 w-full rounded border border-[var(--st-border)] bg-[var(--st-bg-page)] px-2 py-1.5 text-sm"
                placeholder="https://api.openai.com/v1"
              />
            </label>
            <label class="block text-sm">
              <span class="text-[var(--st-text-secondary)]">API Key</span>
              <input
                v-model="openaiApiKey"
                type="password"
                class="mt-1 w-full rounded border border-[var(--st-border)] bg-[var(--st-bg-page)] px-2 py-1.5 text-sm"
                placeholder="留空则保持已保存的密钥"
                autocomplete="off"
              />
            </label>
            <label class="block text-sm">
              <span class="text-[var(--st-text-secondary)]">模型</span>
              <input
                v-model="openaiModel"
                type="text"
                class="mt-1 w-full rounded border border-[var(--st-border)] bg-[var(--st-bg-page)] px-2 py-1.5 text-sm"
              />
            </label>
          </template>
        </div>

        <div
          class="flex justify-end gap-2 border-t border-[var(--st-border)] px-4 py-3"
        >
          <button
            type="button"
            class="rounded border border-[var(--st-border)] px-3 py-1.5 text-sm hover:bg-[var(--st-bg-subtle)]"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded bg-[var(--st-accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            :disabled="saving"
            @click="handleSave"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
