import type {
  AgentProvider,
  ChatCompletionResult,
  ChatMessage,
  StreamCallbacks,
  ToolDefinition,
} from './types.js'

export function createOllamaProvider(baseUrl: string, model: string): AgentProvider {
  const root = baseUrl.replace(/\/$/, '')

  return {
    id: 'ollama',
    async chat({ messages, tools, stream }) {
      const body: Record<string, unknown> = {
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
          ...(m.name ? { name: m.name } : {}),
        })),
        stream: Boolean(stream?.onToken),
      }
      if (tools && tools.length > 0) {
        body.tools = tools
      }

      const res = await fetch(`${root}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`Ollama 请求失败: ${res.status} ${errText}`)
      }

      if (stream?.onToken && res.body) {
        return parseOllamaStream(res.body, stream)
      }

      const data = (await res.json()) as {
        message?: {
          role: string
          content: string
          tool_calls?: ChatCompletionResult['message']['tool_calls']
        }
        done_reason?: string
      }

      const msg = data.message ?? { role: 'assistant', content: '' }
      return {
        message: {
          role: 'assistant',
          content: msg.content ?? '',
          tool_calls: msg.tool_calls,
        },
        finishReason: data.done_reason ?? null,
      }
    },
  }
}

async function parseOllamaStream(
  body: ReadableStream<Uint8Array>,
  stream: StreamCallbacks
): Promise<ChatCompletionResult> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let toolCalls: ChatCompletionResult['message']['tool_calls']
  let finishReason: string | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const chunk = JSON.parse(trimmed) as {
          message?: {
            content?: string
            tool_calls?: ChatCompletionResult['message']['tool_calls']
          }
          done?: boolean
          done_reason?: string
        }
        if (chunk.message?.content) {
          const delta = chunk.message.content
          fullContent += delta
          stream.onToken?.(delta)
        }
        if (chunk.message?.tool_calls) {
          toolCalls = chunk.message.tool_calls
        }
        if (chunk.done) {
          finishReason = chunk.done_reason ?? 'stop'
        }
      } catch {
        // skip malformed line
      }
    }
  }

  return {
    message: {
      role: 'assistant',
      content: fullContent,
      tool_calls: toolCalls,
    },
    finishReason,
  }
}
