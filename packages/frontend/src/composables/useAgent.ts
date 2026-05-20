import { ref, computed, onMounted } from 'vue'
function uid() {
  return crypto.randomUUID()
}
import {
  fetchAgentConfig,
  updateAgentConfig,
  streamAgentChat,
  confirmAgentActions,
} from '../api/agent'
import type {
  AgentConfig,
  AgentHealth,
  AgentMessage,
  AgentProviderId,
  PendingActionPreview,
} from '../types/agent'

const PANEL_OPEN_KEY = 'solo-task-agent-panel-open'

export function useAgent() {
  const sessionId = ref<string | undefined>(undefined)
  const messages = ref<AgentMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const config = ref<AgentConfig | null>(null)
  const health = ref<AgentHealth | null>(null)
  const panelOpen = ref(localStorage.getItem(PANEL_OPEN_KEY) === '1')
  const showSettings = ref(false)

  const connectionStatus = computed<'ok' | 'offline' | 'unknown'>(() => {
    if (!config.value || !health.value) return 'unknown'
    const h =
      config.value.provider === 'ollama'
        ? health.value.ollama
        : health.value.openai_compat
    return h.ok ? 'ok' : 'offline'
  })

  function setPanelOpen(open: boolean) {
    panelOpen.value = open
    localStorage.setItem(PANEL_OPEN_KEY, open ? '1' : '0')
  }

  function togglePanel() {
    setPanelOpen(!panelOpen.value)
  }

  async function loadConfig() {
    try {
      const data = await fetchAgentConfig()
      config.value = data.config
      health.value = data.health
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载配置失败'
    }
  }

  async function saveConfig(patch: Parameters<typeof updateAgentConfig>[0]) {
    const data = await updateAgentConfig(patch)
    config.value = data.config
    health.value = data.health
  }

  async function sendMessage(text: string, provider?: AgentProviderId) {
    const trimmed = text.trim()
    if (!trimmed || loading.value) return

    error.value = null
    loading.value = true

    const userMsg: AgentMessage = {
      id: uid(),
      role: 'user',
      content: trimmed,
    }
    messages.value.push(userMsg)

    const assistantId = uid()
    const assistantMsg: AgentMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
      toolResults: [],
    }
    messages.value.push(assistantMsg)

    const idx = () => messages.value.findIndex(m => m.id === assistantId)

    try {
      const newSessionId = await streamAgentChat(
        {
          sessionId: sessionId.value,
          message: trimmed,
          provider,
        },
        {
          onToken: t => {
            const i = idx()
            if (i >= 0) messages.value[i].content += t
          },
          onToolResult: data => {
            const i = idx()
            if (i >= 0) {
              messages.value[i].toolResults ??= []
              messages.value[i].toolResults!.push(data)
            }
          },
          onPendingActions: data => {
            const i = idx()
            if (i >= 0) {
              const sid = String(
                (data as { sessionId?: string }).sessionId ?? sessionId.value ?? ''
              )
              if (sid) sessionId.value = sid
              messages.value[i].pendingBatch = {
                batchId: data.batchId,
                sessionId: sid,
                actions: data.actions as PendingActionPreview[],
              }
            }
          },
          onDone: data => {
            sessionId.value = data.sessionId
          },
          onError: msg => {
            error.value = msg
            const i = idx()
            if (i >= 0) {
              messages.value[i].content += `\n\n⚠ ${msg}`
            }
          },
        }
      )
      sessionId.value = newSessionId
    } catch (e) {
      error.value = e instanceof Error ? e.message : '发送失败'
      const i = idx()
      if (i >= 0) {
        messages.value[i].content =
          messages.value[i].content || (error.value ?? '发送失败')
      }
    } finally {
      const i = idx()
      if (i >= 0) messages.value[i].streaming = false
      loading.value = false
    }
  }

  async function confirmBatch(
    messageId: string,
    batchId: string,
    actionIds: string[],
    batchSessionId?: string
  ) {
    const sid = batchSessionId ?? sessionId.value
    if (!sid) return
    const result = await confirmAgentActions({
      sessionId: sid,
      batchId,
      actionIds: actionIds.length > 0 ? actionIds : undefined,
    })
    const msg = messages.value.find(m => m.id === messageId)
    if (msg?.pendingBatch) {
      msg.pendingBatch = undefined
      msg.confirmResult = {
        executed: result.executed,
        failed: result.failed,
      }
      const lines = [
        ...result.executed.map(e => `✓ ${e.message}`),
        ...result.failed.map(f => `✗ ${f.message}`),
      ]
      msg.content += `\n\n**执行结果**\n${lines.join('\n')}`
    }
    return result
  }

  function clearMessages() {
    messages.value = []
    sessionId.value = undefined
  }

  onMounted(() => {
    loadConfig()
  })

  return {
    sessionId,
    messages,
    loading,
    error,
    config,
    health,
    panelOpen,
    showSettings,
    connectionStatus,
    setPanelOpen,
    togglePanel,
    loadConfig,
    saveConfig,
    sendMessage,
    confirmBatch,
    clearMessages,
  }
}
