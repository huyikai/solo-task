import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import type { AgentProviderId } from './providers/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const CONFIG_FILE = path.join(PROJECT_ROOT, 'data', 'agent.config.json')

export interface AgentConfig {
  provider: AgentProviderId
  ollama: {
    baseUrl: string
    model: string
  }
  openaiCompat: {
    baseUrl: string
    apiKey: string
    model: string
  }
}

const DEFAULT_CONFIG: AgentConfig = {
  provider: 'ollama',
  ollama: {
    baseUrl: 'http://127.0.0.1:11434',
    model: 'llama3.2',
  },
  openaiCompat: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
  },
}

let cached: AgentConfig | null = null

function envProvider(): AgentProviderId | undefined {
  const v = process.env.AGENT_PROVIDER
  if (v === 'ollama' || v === 'openai_compat') return v
  return undefined
}

function mergeFromEnv(base: AgentConfig): AgentConfig {
  const out = structuredClone(base)
  const p = envProvider()
  if (p) out.provider = p
  if (process.env.OLLAMA_BASE_URL) out.ollama.baseUrl = process.env.OLLAMA_BASE_URL
  if (process.env.OLLAMA_MODEL) out.ollama.model = process.env.OLLAMA_MODEL
  if (process.env.OPENAI_COMPAT_BASE_URL) {
    out.openaiCompat.baseUrl = process.env.OPENAI_COMPAT_BASE_URL
  }
  if (process.env.OPENAI_COMPAT_API_KEY) {
    out.openaiCompat.apiKey = process.env.OPENAI_COMPAT_API_KEY
  }
  if (process.env.OPENAI_COMPAT_MODEL) {
    out.openaiCompat.model = process.env.OPENAI_COMPAT_MODEL
  }
  return out
}

export async function loadAgentConfig(): Promise<AgentConfig> {
  if (cached) return cached

  let fileConfig: Partial<AgentConfig> = {}
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8')
    fileConfig = JSON.parse(raw) as Partial<AgentConfig>
  } catch {
    // no file
  }

  const merged: AgentConfig = {
    provider: fileConfig.provider ?? DEFAULT_CONFIG.provider,
    ollama: { ...DEFAULT_CONFIG.ollama, ...fileConfig.ollama },
    openaiCompat: {
      ...DEFAULT_CONFIG.openaiCompat,
      ...fileConfig.openaiCompat,
    },
  }

  cached = mergeFromEnv(merged)
  return cached
}

export function invalidateAgentConfigCache(): void {
  cached = null
}

export type AgentConfigPatch = {
  provider?: AgentProviderId
  ollama?: Partial<AgentConfig['ollama']>
  openaiCompat?: Partial<AgentConfig['openaiCompat']>
}

export async function saveAgentConfig(patch: AgentConfigPatch): Promise<AgentConfig> {
  const current = await loadAgentConfig()
  const next: AgentConfig = {
    provider: patch.provider ?? current.provider,
    ollama: { ...current.ollama, ...patch.ollama },
    openaiCompat: {
      ...current.openaiCompat,
      ...patch.openaiCompat,
    },
  }
  if (
    patch.openaiCompat?.apiKey &&
    patch.openaiCompat.apiKey !== '***' &&
    patch.openaiCompat.apiKey.trim() !== ''
  ) {
    next.openaiCompat.apiKey = patch.openaiCompat.apiKey
  }

  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true })
  await fs.writeFile(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf-8')
  cached = mergeFromEnv(next)
  return cached
}

export function maskConfig(config: AgentConfig) {
  return {
    provider: config.provider,
    ollama: { ...config.ollama },
    openaiCompat: {
      baseUrl: config.openaiCompat.baseUrl,
      model: config.openaiCompat.model,
      apiKey: config.openaiCompat.apiKey ? '***' : '',
    },
  }
}

export async function checkOllamaHealth(baseUrl: string): Promise<{
  ok: boolean
  models?: string[]
  error?: string
}> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as { models?: { name: string }[] }
    const models = (data.models ?? []).map(m => m.name)
    return { ok: true, models }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '连接失败',
    }
  }
}

export async function checkOpenAICompatHealth(
  baseUrl: string,
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey) return { ok: false, error: '未配置 API Key' }
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/models`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '连接失败',
    }
  }
}
