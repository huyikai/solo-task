import type { AgentProviderId } from './providers/types.js'
import type { ChatMessage } from './providers/types.js'
import { createProvider } from './providers/factory.js'
import { TASK_TOOL_DEFINITIONS } from './tools/definitions.js'
import {
  executeReadTool,
  buildPendingAction,
} from './tools/executor.js'
import { isReadTool, isWriteTool, isKnownTool } from './tools/classify.js'
import {
  getOrCreateSession,
  appendMessage,
  createPendingBatch,
  getPendingBatch,
  removePendingBatch,
  type PendingAction,
} from './sessionStore.js'
import { executeWriteAction, formatReadResultAsMarkdown } from './tools/executor.js'

const MAX_TOOL_ROUNDS = 8
const MAX_ACTIONS_PER_BATCH = 20

const SYSTEM_PROMPT = `你是 solo-task 个人任务管理助手。你可以通过工具查询和管理任务。

任务字段说明：
- status: todo(待办) | in-progress(进行中) | done(已完成) | archived(归档)
- priority: low | medium | high | urgent
- parentId: 父任务 id，子任务嵌套在父任务下
- dueDate/startDate/endDate: ISO 日期字符串或 null；甘特图需要 startDate+endDate 或 dueDate

规则：
1. 用户指代不明确时，先用 search_tasks 或 list_tasks 查询，再提议修改。
2. 创建、更新、删除、改状态、看板重排、导出等写操作会生成预览，由用户确认后才执行；你应清楚说明将要做什么。
3. 回复使用与用户相同的语言（中文优先），简洁友好。
4. 批量操作注意子任务与逾期逻辑。`

export interface SseEmitter {
  send(event: string, data: unknown): void
}

export async function runAgentChat(params: {
  sessionId?: string
  message: string
  provider?: AgentProviderId
  emit: SseEmitter
}): Promise<{ sessionId: string }> {
  const session = getOrCreateSession(params.sessionId)
  const provider = await createProvider(params.provider)

  appendMessage(session.id, { role: 'user', content: params.message })

  const history: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...session.messages,
  ]

  const pendingActions: Omit<PendingAction, 'id'>[] = []
  let rounds = 0

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++
    const result = await provider.chat({
      messages: history,
      tools: TASK_TOOL_DEFINITIONS,
      stream: {
        onToken: text => params.emit.send('token', { text }),
      },
    })

    let assistantMsg = result.message
    const toolCalls = assistantMsg.tool_calls

    // 小模型第二轮可能仍无正文：用工具结果生成可读摘要
    if (
      (!toolCalls || toolCalls.length === 0) &&
      !assistantMsg.content?.trim()
    ) {
      const fallback = formatReadResultAsMarkdown(history)
      if (fallback) {
        assistantMsg = { ...assistantMsg, content: fallback }
        params.emit.send('token', { text: fallback })
      }
    }

    appendMessage(session.id, assistantMsg)
    history.push(assistantMsg)

    if (!toolCalls || toolCalls.length === 0) {
      break
    }

    for (const tc of toolCalls) {
      const name = tc.function.name
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
      } catch {
        args = {}
      }

      if (!isKnownTool(name)) {
        const errContent = JSON.stringify({ error: `未知工具: ${name}` })
        const toolMsg: ChatMessage = {
          role: 'tool',
          tool_call_id: tc.id,
          name,
          content: errContent,
        }
        appendMessage(session.id, toolMsg)
        history.push(toolMsg)
        continue
      }

      if (isReadTool(name)) {
        try {
          const readResult = await executeReadTool(name, args)
          const items = Array.isArray(readResult.data)
            ? readResult.data
            : readResult.data != null
              ? [readResult.data]
              : []
          params.emit.send('tool_result', {
            tool: name,
            summary: readResult.summary,
            items,
          })
          const toolMsg: ChatMessage = {
            role: 'tool',
            tool_call_id: tc.id,
            name,
            content: JSON.stringify(readResult.data),
          }
          appendMessage(session.id, toolMsg)
          history.push(toolMsg)
        } catch (e) {
          const msg = e instanceof Error ? e.message : '执行失败'
          const toolMsg: ChatMessage = {
            role: 'tool',
            tool_call_id: tc.id,
            name,
            content: JSON.stringify({ error: msg }),
          }
          appendMessage(session.id, toolMsg)
          history.push(toolMsg)
        }
      } else if (isWriteTool(name)) {
        if (pendingActions.length >= MAX_ACTIONS_PER_BATCH) {
          const toolMsg: ChatMessage = {
            role: 'tool',
            tool_call_id: tc.id,
            name,
            content: JSON.stringify({ error: '本批操作已达上限' }),
          }
          history.push(toolMsg)
          continue
        }
        const pending = buildPendingAction(name, args)
        pendingActions.push(pending)
        const toolMsg: ChatMessage = {
          role: 'tool',
          tool_call_id: tc.id,
          name,
          content: JSON.stringify({
            status: 'pending_confirmation',
            summary: pending.summary,
          }),
        }
        appendMessage(session.id, toolMsg)
        history.push(toolMsg)
      }
    }

    // 执行工具后继续下一轮，让模型根据 tool 结果生成自然语言回复
    continue
  }

  if (pendingActions.length > 0) {
    const batch = createPendingBatch(session.id, pendingActions)
    params.emit.send('pending_actions', {
      sessionId: session.id,
      batchId: batch.batchId,
      actions: batch.actions.map(a => ({
        id: a.id,
        type: a.type,
        summary: a.summary,
        diff: a.diff,
      })),
    })
  }

  params.emit.send('done', { sessionId: session.id })
  return { sessionId: session.id }
}

export async function confirmPendingActions(params: {
  sessionId: string
  batchId: string
  actionIds?: string[]
}): Promise<{
  executed: { id: string; message: string }[]
  failed: { id: string; message: string }[]
  cancelled: string[]
}> {
  const batch = getPendingBatch(params.sessionId, params.batchId)
  if (!batch) {
    throw new Error('预览批次不存在或已过期')
  }

  const toRun =
    params.actionIds && params.actionIds.length > 0
      ? batch.actions.filter(a => params.actionIds!.includes(a.id))
      : batch.actions

  const cancelled = batch.actions
    .filter(a => !toRun.includes(a))
    .map(a => a.id)

  const executed: { id: string; message: string }[] = []
  const failed: { id: string; message: string }[] = []

  for (const action of toRun) {
    const result = await executeWriteAction(action)
    if (result.ok) {
      executed.push({ id: action.id, message: result.message })
    } else {
      failed.push({ id: action.id, message: result.message })
      break
    }
  }

  removePendingBatch(params.sessionId, params.batchId)

  return { executed, failed, cancelled }
}
