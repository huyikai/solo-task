export type AgentProviderId = 'ollama' | 'openai_compat'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ChatCompletionResult {
  message: ChatMessage
  finishReason: string | null
}

export interface StreamCallbacks {
  onToken?: (text: string) => void
}

export interface AgentProvider {
  id: AgentProviderId
  chat(params: {
    messages: ChatMessage[]
    tools?: ToolDefinition[]
    stream?: StreamCallbacks
  }): Promise<ChatCompletionResult>
}
