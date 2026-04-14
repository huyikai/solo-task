import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { nanoid } from 'nanoid'
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  KanbanReorderColumns,
} from '../types/task.js'
import { TASK_STATUSES } from '../types/task.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const DATA_DIR = path.join(PROJECT_ROOT, 'data')
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json')

let writeLock: Promise<void> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeLock.then(() => fn())
  writeLock = next.then(() => {}, () => {})
  return next
}

function statusRank(s: TaskStatus): number {
  return TASK_STATUSES.indexOf(s)
}

function sortTasksList(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ra = statusRank(a.status)
    const rb = statusRank(b.status)
    if (ra !== rb) return ra - rb
    const boA = a.boardOrder ?? 0
    const boB = b.boardOrder ?? 0
    if (boA !== boB) return boA - boB
    return a.createdAt.localeCompare(b.createdAt)
  })
}

function isTopLevelTask(t: Task, allIds: Set<string>): boolean {
  if (!t.parentId || t.parentId === t.id) return true
  return !allIds.has(t.parentId)
}

async function readRawTasks(): Promise<Task[]> {
  const raw = await fs.readFile(TASKS_FILE, 'utf-8')
  return JSON.parse(raw) as Task[]
}

/** 补齐 boardOrder 并写回（仅当存在缺失或非数字时） */
async function migrateBoardOrdersIfNeeded(tasks: Task[]): Promise<Task[]> {
  let changed = false
  for (const t of tasks) {
    if (!Number.isFinite(t.boardOrder)) {
      changed = true
      break
    }
  }
  if (!changed) return tasks

  for (const status of TASK_STATUSES) {
    const group = tasks.filter(t => t.status === status)
    group.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    group.forEach((t, i) => {
      t.boardOrder = i
    })
  }
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8')
  return tasks
}

async function loadTasks(): Promise<Task[]> {
  const raw = await readRawTasks()
  return migrateBoardOrdersIfNeeded(raw)
}

async function writeTasks(tasks: Task[]): Promise<void> {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8')
}

function nextBoardOrderForStatus(tasks: Task[], status: TaskStatus): number {
  const inS = tasks.filter(t => t.status === status)
  if (inS.length === 0) return 0
  return Math.max(...inS.map(t => (Number.isFinite(t.boardOrder) ? t.boardOrder : 0))) + 1
}

export async function initDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR)
  } catch {
    console.error(
      `[solo-task] data/ 目录不存在。请先执行：\n` +
        `  git clone git@github.com:huyikai/solo-task-data.git data/`
    )
    process.exit(1)
  }

  try {
    await fs.access(TASKS_FILE)
  } catch {
    console.log('[solo-task] tasks.json 不存在，正在创建...')
    await fs.writeFile(TASKS_FILE, '[]', 'utf-8')
    console.log('[solo-task] 已创建 data/tasks.json，建议提交到数据仓库。')
  }
}

export async function getAllTasks(filters?: {
  status?: string
  priority?: string
  tag?: string
}): Promise<Task[]> {
  let tasks = await loadTasks()
  tasks = sortTasksList(tasks)

  if (filters?.status) {
    tasks = tasks.filter(t => t.status === filters.status)
  }
  if (filters?.priority) {
    tasks = tasks.filter(t => t.priority === filters.priority)
  }
  if (filters?.tag) {
    tasks = tasks.filter(t => t.tags.includes(filters.tag!))
  }

  return tasks
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  const tasks = await loadTasks()
  return tasks.find(t => t.id === id)
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return withLock(async () => {
    const tasks = await readRawTasks()
    await migrateBoardOrdersIfNeeded(tasks)
    const now = new Date().toISOString()
    const status = input.status ?? 'todo'
    const boardOrder =
      input.boardOrder !== undefined
        ? input.boardOrder
        : nextBoardOrderForStatus(tasks, status)

    const task: Task = {
      id: nanoid(),
      title: input.title,
      description: input.description ?? '',
      status,
      boardOrder,
      priority: input.priority ?? 'medium',
      tags: input.tags ?? [],
      dueDate: input.dueDate ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      parentId: input.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    }

    tasks.push(task)
    await writeTasks(tasks)
    return task
  })
}

function cascadeStatusToDescendants(
  tasks: Task[],
  parentId: string,
  status: Task['status'],
  now: string
): void {
  for (const t of tasks) {
    if (t.parentId === parentId) {
      t.status = status
      t.updatedAt = now
      cascadeStatusToDescendants(tasks, t.id, status, now)
    }
  }
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<Task | null> {
  return withLock(async () => {
    const tasks = await readRawTasks()
    await migrateBoardOrdersIfNeeded(tasks)
    const index = tasks.findIndex(t => t.id === id)
    if (index === -1) return null

    const existing = tasks[index]
    if (input.parentId && input.parentId === id) {
      input.parentId = null
    }
    const now = new Date().toISOString()

    let nextStatus = input.status ?? existing.status
    let nextBoardOrder = input.boardOrder ?? existing.boardOrder

    if (
      input.status !== undefined &&
      input.status !== existing.status &&
      input.boardOrder === undefined
    ) {
      nextStatus = input.status
      nextBoardOrder = nextBoardOrderForStatus(
        tasks.filter(t => t.id !== id),
        input.status
      )
    }

    const updated: Task = {
      ...existing,
      ...input,
      status: nextStatus,
      boardOrder: nextBoardOrder,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    }

    tasks[index] = updated

    if (
      input.status &&
      input.status !== existing.status &&
      (input.status === 'done' || input.status === 'archived')
    ) {
      cascadeStatusToDescendants(tasks, id, input.status, now)
    }

    await writeTasks(tasks)
    return updated
  })
}

export async function deleteTask(
  id: string,
  cascade: boolean = true
): Promise<string[]> {
  return withLock(async () => {
    const tasks = await readRawTasks()
    await migrateBoardOrdersIfNeeded(tasks)
    const deletedIds: string[] = []

    function collectChildren(parentId: string) {
      deletedIds.push(parentId)
      for (const t of tasks) {
        if (t.parentId === parentId) {
          collectChildren(t.id)
        }
      }
    }

    const target = tasks.find(t => t.id === id)
    if (!target) return []

    if (cascade) {
      collectChildren(id)
      const remaining = tasks.filter(t => !deletedIds.includes(t.id))
      await writeTasks(remaining)
    } else {
      deletedIds.push(id)
      const remaining = tasks
        .filter(t => t.id !== id)
        .map(t => (t.parentId === id ? { ...t, parentId: null } : t))
      await writeTasks(remaining)
    }

    return deletedIds
  })
}

export async function updateTaskStatus(
  id: string,
  status: Task['status']
): Promise<Task | null> {
  return updateTask(id, { status })
}

export async function reorderKanban(
  columns: KanbanReorderColumns
): Promise<Task[]> {
  return withLock(async () => {
    const tasks = await readRawTasks()
    await migrateBoardOrdersIfNeeded(tasks)

    const idSet = new Set(tasks.map(t => t.id))
    const allListed = new Set<string>()

    for (const status of TASK_STATUSES) {
      const list = columns[status]
      if (!Array.isArray(list)) {
        throw new Error('INVALID_COLUMNS')
      }
      for (const id of list) {
        if (allListed.has(id)) {
          throw new Error('DUPLICATE_ID')
        }
        allListed.add(id)
        const t = tasks.find(x => x.id === id)
        if (!t) {
          throw new Error('NOT_FOUND')
        }
        if (!isTopLevelTask(t, idSet)) {
          throw new Error('NOT_TOP_LEVEL')
        }
      }
    }

    const topLevelIds = tasks
      .filter(t => isTopLevelTask(t, idSet))
      .map(t => t.id)

    if (allListed.size !== topLevelIds.length) {
      throw new Error('TOP_LEVEL_MISMATCH')
    }
    for (const tid of topLevelIds) {
      if (!allListed.has(tid)) {
        throw new Error('TOP_LEVEL_MISMATCH')
      }
    }

    const now = new Date().toISOString()

    for (const status of TASK_STATUSES) {
      const ordered = columns[status]
      ordered.forEach((id, idx) => {
        const t = tasks.find(x => x.id === id)!
        t.status = status
        t.boardOrder = idx
        t.updatedAt = now
      })

      const rest = tasks.filter(
        t => t.status === status && !ordered.includes(t.id)
      )
      rest.sort((a, b) => {
        const boA = a.boardOrder ?? 0
        const boB = b.boardOrder ?? 0
        if (boA !== boB) return boA - boB
        return a.createdAt.localeCompare(b.createdAt)
      })
      const base = ordered.length
      rest.forEach((t, i) => {
        t.boardOrder = base + i
        t.updatedAt = now
      })
    }

    await writeTasks(tasks)
    return sortTasksList(tasks)
  })
}
