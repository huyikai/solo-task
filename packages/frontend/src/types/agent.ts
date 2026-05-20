export type AgentProviderId = 'ollama' | 'openai_compat'

export interface AgentConfig {
  provider: AgentProviderId
  ollama: { baseUrl: string; model: string }
  openaiCompat: { baseUrl: string; apiKey: string; model: string }
}

export interface AgentHealth {
  ollama: { ok: boolean; models?: string[]; error?: string }
  openai_compat: { ok: boolean; error?: string }
}

export interface PendingActionPreview {
  id: string
  type: string
  summary: string
  diff: Record<string, unknown>
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  streaming?: boolean
  toolResults?: {
    tool: string
    summary: string
    items?: {
      id: string
      title: string
      status: string
      priority: string
      dueDate?: string | null
    }[]
  }[]
  pendingBatch?: {
    batchId: string
    actions: PendingActionPreview[]
    sessionId: string
  }
  confirmResult?: {
    executed: { id: string; message: string }[]
    failed: { id: string; message: string }[]
  }
}
