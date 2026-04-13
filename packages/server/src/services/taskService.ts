import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { nanoid } from 'nanoid'
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types/task.js'

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

async function readTasks(): Promise<Task[]> {
  const raw = await fs.readFile(TASKS_FILE, 'utf-8')
  return JSON.parse(raw) as Task[]
}

async function writeTasks(tasks: Task[]): Promise<void> {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8')
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
  let tasks = await readTasks()

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
  const tasks = await readTasks()
  return tasks.find(t => t.id === id)
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return withLock(async () => {
    const tasks = await readTasks()
    const now = new Date().toISOString()

    const task: Task = {
      id: nanoid(),
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'todo',
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
    const tasks = await readTasks()
    const index = tasks.findIndex(t => t.id === id)
    if (index === -1) return null

    const existing = tasks[index]
    if (input.parentId && input.parentId === id) {
      input.parentId = null
    }
    const now = new Date().toISOString()
    const updated: Task = {
      ...existing,
      ...input,
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
    const tasks = await readTasks()
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
