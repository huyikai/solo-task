import type {
  AgentProvider,
  ChatCompletionResult,
  ChatMessage,
  StreamCallbacks,
  ToolDefinition,
} from './types.js'

export function createOpenAICompatProvider(
  baseUrl: string,
  apiKey: string,
  model: string
): AgentProvider {
  const root = baseUrl.replace(/\/$/, '')

  return {
    id: 'openai_compat',
    async chat({ messages, tools, stream }) {
      const body: Record<string, unknown> = {
        model,
        messages: messages.map(m => {
          const base: Record<string, unknown> = {
            role: m.role,
            content: m.content,
          }
          if (m.tool_calls) base.tool_calls = m.tool_calls
          if (m.tool_call_id) base.tool_call_id = m.tool_call_id
          if (m.name) base.name = m.name
          return base
        }),
        stream: Boolean(stream?.onToken),
      }
      if (tools && tools.length > 0) {
        body.tools = tools
      }

      const res = await fetch(`${root}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`API 请求失败: ${res.status} ${errText}`)
      }

      if (stream?.onToken && res.body) {
        return parseOpenAIStream(res.body, stream)
      }

      const data = (await res.json()) as {
        choices?: {
          message?: {
            role: string
            content: string | null
            tool_calls?: ChatCompletionResult['message']['tool_calls']
          }
          finish_reason?: string
        }[]
      }

      const choice = data.choices?.[0]
      const msg = choice?.message
      return {
        message: {
          role: 'assistant',
          content: msg?.content ?? '',
          tool_calls: msg?.tool_calls,
        },
        finishReason: choice?.finish_reason ?? null,
      }
    },
  }
}

async function parseOpenAIStream(
  body: ReadableStream<Uint8Array>,
  stream: StreamCallbacks
): Promise<ChatCompletionResult> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  const toolCallsMap = new Map<
    number,
    { id: string; name: string; arguments: string }
  >()
  let finishReason: string | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const chunk = JSON.parse(payload) as {
          choices?: {
            delta?: {
              content?: string
              tool_calls?: {
                index: number
                id?: string
                function?: { name?: string; arguments?: string }
              }[]
            }
            finish_reason?: string
          }[]
        }
        const delta = chunk.choices?.[0]?.delta
        if (delta?.content) {
          fullContent += delta.content
          stream.onToken?.(delta.content)
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCallsMap.get(tc.index) ?? {
              id: tc.id ?? '',
              name: '',
              arguments: '',
            }
            if (tc.id) existing.id = tc.id
            if (tc.function?.name) existing.name = tc.function.name
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments
            }
            toolCallsMap.set(tc.index, existing)
          }
        }
        const fr = chunk.choices?.[0]?.finish_reason
        if (fr) finishReason = fr
      } catch {
        // skip
      }
    }
  }

  const tool_calls =
    toolCallsMap.size > 0
      ? [...toolCallsMap.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, v]) => ({
            id: v.id,
            type: 'function' as const,
            function: { name: v.name, arguments: v.arguments },
          }))
      : undefined

  return {
    message: {
      role: 'assistant',
      content: fullContent,
      tool_calls,
    },
    finishReason,
  }
}
