import { loadAgentConfig } from '../config.js'
import type { AgentProvider, AgentProviderId } from './types.js'
import { createOllamaProvider } from './ollama.js'
import { createOpenAICompatProvider } from './openai-compat.js'

export async function createProvider(
  override?: AgentProviderId
): Promise<AgentProvider> {
  const config = await loadAgentConfig()
  const id = override ?? config.provider

  if (id === 'ollama') {
    return createOllamaProvider(config.ollama.baseUrl, config.ollama.model)
  }
  return createOpenAICompatProvider(
    config.openaiCompat.baseUrl,
    config.openaiCompat.apiKey,
    config.openaiCompat.model
  )
}
