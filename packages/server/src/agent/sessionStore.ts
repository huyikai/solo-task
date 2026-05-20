import { nanoid } from 'nanoid'
import type { ChatMessage } from './providers/types.js'

export interface PendingAction {
  id: string
  type: string
  summary: string
  diff: Record<string, unknown>
  payload: Record<string, unknown>
}

export interface PendingBatch {
  batchId: string
  sessionId: string
  actions: PendingAction[]
  createdAt: string
}

export interface AgentSession {
  id: string
  messages: ChatMessage[]
  pendingBatches: Map<string, PendingBatch>
  createdAt: string
  updatedAt: string
}

const sessions = new Map<string, AgentSession>()

const MAX_SESSIONS = 50
const MAX_MESSAGES = 40

export function getOrCreateSession(sessionId?: string): AgentSession {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!
  }
  const id = sessionId ?? nanoid()
  const now = new Date().toISOString()
  const session: AgentSession = {
    id,
    messages: [],
    pendingBatches: new Map(),
    createdAt: now,
    updatedAt: now,
  }
  sessions.set(id, session)
  trimSessions()
  return session
}

function trimSessions() {
  if (sessions.size <= MAX_SESSIONS) return
  const sorted = [...sessions.values()].sort(
    (a, b) => a.updatedAt.localeCompare(b.updatedAt)
  )
  const remove = sorted.slice(0, sessions.size - MAX_SESSIONS)
  for (const s of remove) sessions.delete(s.id)
}

export function appendMessage(sessionId: string, message: ChatMessage): void {
  const session = sessions.get(sessionId)
  if (!session) return
  session.messages.push(message)
  if (session.messages.length > MAX_MESSAGES) {
    const system = session.messages.filter(m => m.role === 'system')
    const rest = session.messages.filter(m => m.role !== 'system')
    session.messages = [...system.slice(0, 1), ...rest.slice(-(MAX_MESSAGES - 1))]
  }
  session.updatedAt = new Date().toISOString()
}

export function getSessionMessages(sessionId: string): ChatMessage[] {
  return sessions.get(sessionId)?.messages ?? []
}

export function createPendingBatch(
  sessionId: string,
  actions: Omit<PendingAction, 'id'>[]
): PendingBatch {
  const session = getOrCreateSession(sessionId)
  const batchId = nanoid()
  const batch: PendingBatch = {
    batchId,
    sessionId,
    actions: actions.map(a => ({ ...a, id: nanoid() })),
    createdAt: new Date().toISOString(),
  }
  session.pendingBatches.set(batchId, batch)
  session.updatedAt = new Date().toISOString()
  return batch
}

export function getPendingBatch(
  sessionId: string,
  batchId: string
): PendingBatch | undefined {
  return sessions.get(sessionId)?.pendingBatches.get(batchId)
}

export function removePendingBatch(sessionId: string, batchId: string): void {
  sessions.get(sessionId)?.pendingBatches.delete(batchId)
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId)
}
