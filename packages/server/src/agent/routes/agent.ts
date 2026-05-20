import { Router, Request, Response } from 'express'
import {
  loadAgentConfig,
  saveAgentConfig,
  maskConfig,
  checkOllamaHealth,
  checkOpenAICompatHealth,
  invalidateAgentConfigCache,
} from '../config.js'
import { runAgentChat, confirmPendingActions } from '../orchestrator.js'
import { deleteSession } from '../sessionStore.js'
import type { AgentProviderId } from '../providers/types.js'

const router = Router()

function writeSse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

router.get('/config', async (_req: Request, res: Response) => {
  const config = await loadAgentConfig()
  const masked = maskConfig(config)
  const [ollama, openaiCompat] = await Promise.all([
    checkOllamaHealth(config.ollama.baseUrl),
    checkOpenAICompatHealth(
      config.openaiCompat.baseUrl,
      config.openaiCompat.apiKey
    ),
  ])
  res.json({
    success: true,
    data: {
      config: masked,
      health: {
        ollama,
        openai_compat: openaiCompat,
      },
    },
  })
})

router.put('/config', async (req: Request, res: Response) => {
  const body = req.body ?? {}
  const patch: {
    provider?: AgentProviderId
    ollama?: Partial<{ baseUrl: string; model: string }>
    openaiCompat?: Partial<{ baseUrl: string; apiKey: string; model: string }>
  } = {}

  if (body.provider === 'ollama' || body.provider === 'openai_compat') {
    patch.provider = body.provider
  }
  if (body.ollama && typeof body.ollama === 'object') {
    const o: Partial<{ baseUrl: string; model: string }> = {}
    if (typeof body.ollama.baseUrl === 'string') o.baseUrl = body.ollama.baseUrl
    if (typeof body.ollama.model === 'string') o.model = body.ollama.model
    if (Object.keys(o).length > 0) patch.ollama = o
  }
  if (body.openaiCompat && typeof body.openaiCompat === 'object') {
    const o: Partial<{ baseUrl: string; apiKey: string; model: string }> = {}
    if (typeof body.openaiCompat.baseUrl === 'string') {
      o.baseUrl = body.openaiCompat.baseUrl
    }
    if (typeof body.openaiCompat.model === 'string') {
      o.model = body.openaiCompat.model
    }
    if (
      typeof body.openaiCompat.apiKey === 'string' &&
      body.openaiCompat.apiKey !== '***'
    ) {
      o.apiKey = body.openaiCompat.apiKey
    }
    if (Object.keys(o).length > 0) patch.openaiCompat = o
  }

  invalidateAgentConfigCache()
  const saved = await saveAgentConfig(patch)
  const masked = maskConfig(saved)
  const [ollama, openaiCompat] = await Promise.all([
    checkOllamaHealth(saved.ollama.baseUrl),
    checkOpenAICompatHealth(
      saved.openaiCompat.baseUrl,
      saved.openaiCompat.apiKey
    ),
  ])
  res.json({
    success: true,
    data: {
      config: masked,
      health: { ollama, openai_compat: openaiCompat },
    },
  })
})

router.post('/chat', async (req: Request, res: Response) => {
  const { sessionId, message, provider } = req.body ?? {}
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'message 不能为空' },
    })
    return
  }

  const wantsStream =
    req.headers.accept?.includes('text/event-stream') ||
    req.query.stream === '1'

  const providerId =
    provider === 'ollama' || provider === 'openai_compat'
      ? (provider as AgentProviderId)
      : undefined

  if (wantsStream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    try {
      await runAgentChat({
        sessionId: typeof sessionId === 'string' ? sessionId : undefined,
        message: message.trim(),
        provider: providerId,
        emit: {
          send: (event, data) => writeSse(res, event, data),
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '对话失败'
      writeSse(res, 'error', { message: msg })
    }
    res.end()
    return
  }

  try {
    const chunks: { event: string; data: unknown }[] = []
    const result = await runAgentChat({
      sessionId: typeof sessionId === 'string' ? sessionId : undefined,
      message: message.trim(),
      provider: providerId,
      emit: {
        send: (event, data) => chunks.push({ event, data }),
      },
    })
    res.json({ success: true, data: { sessionId: result.sessionId, events: chunks } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '对话失败'
    res.status(500).json({
      success: false,
      error: { code: 'AGENT_ERROR', message: msg },
    })
  }
})

router.post('/confirm', async (req: Request, res: Response) => {
  const { sessionId, batchId, actionIds } = req.body ?? {}
  if (!sessionId || !batchId) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '缺少 sessionId 或 batchId' },
    })
    return
  }

  try {
    const result = await confirmPendingActions({
      sessionId: String(sessionId),
      batchId: String(batchId),
      actionIds: Array.isArray(actionIds) ? actionIds.map(String) : undefined,
    })
    res.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '确认失败'
    res.status(400).json({
      success: false,
      error: { code: 'CONFIRM_ERROR', message: msg },
    })
  }
})

router.delete('/sessions/:id', (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const ok = deleteSession(id)
  res.json({ success: true, data: { deleted: ok } })
})

export default router
