import type { AgentConfig, AgentHealth } from '../types/agent'

const BASE = '/api/agent'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error?.message ?? '请求失败')
  }
  return json.data as T
}

export function fetchAgentConfig(): Promise<{
  config: AgentConfig
  health: AgentHealth
}> {
  return request(`${BASE}/config`)
}

export function updateAgentConfig(patch: {
  provider?: AgentConfig['provider']
  ollama?: Partial<AgentConfig['ollama']>
  openaiCompat?: Partial<AgentConfig['openaiCompat']>
}): Promise<{ config: AgentConfig; health: AgentHealth }> {
  return request(`${BASE}/config`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export function confirmAgentActions(body: {
  sessionId: string
  batchId: string
  actionIds?: string[]
}): Promise<{
  executed: { id: string; message: string }[]
  failed: { id: string; message: string }[]
  cancelled: string[]
}> {
  return request(`${BASE}/confirm`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export interface AgentSseHandlers {
  onToken?: (text: string) => void
  onToolResult?: (data: {
    tool: string
    summary: string
    items?: { id: string; title: string; status: string; priority: string; dueDate?: string | null }[]
  }) => void
  onPendingActions?: (data: {
    batchId: string
    actions: { id: string; type: string; summary: string; diff: Record<string, unknown> }[]
  }) => void
  onDone?: (data: { sessionId: string }) => void
  onError?: (message: string) => void
}

export async function streamAgentChat(
  body: { sessionId?: string; message: string; provider?: AgentConfig['provider'] },
  handlers: AgentSseHandlers
): Promise<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      throw new Error(json.error?.message ?? '对话失败')
    } catch {
      throw new Error(text || '对话失败')
    }
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''
  let sessionId = body.sessionId ?? ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      let event = 'message'
      let dataStr = ''
      for (const line of part.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataStr += line.slice(5).trim()
      }
      if (!dataStr) continue
      try {
        const data = JSON.parse(dataStr) as Record<string, unknown>
        switch (event) {
          case 'token':
            handlers.onToken?.(String(data.text ?? ''))
            break
          case 'tool_result':
            handlers.onToolResult?.(data as { tool: string; summary: string })
            break
          case 'pending_actions':
            handlers.onPendingActions?.(
              data as Parameters<NonNullable<AgentSseHandlers['onPendingActions']>>[0]
            )
            break
          case 'done':
            sessionId = String(data.sessionId ?? sessionId)
            handlers.onDone?.({ sessionId })
            break
          case 'error':
            handlers.onError?.(String(data.message ?? '未知错误'))
            break
        }
      } catch {
        // skip
      }
    }
  }

  return sessionId
}
