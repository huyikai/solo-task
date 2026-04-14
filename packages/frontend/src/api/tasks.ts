import type { KanbanReorderColumns, Task } from '../types/task'
import type { ExportTasksPayload } from '../types/export'

const BASE = '/api/tasks'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error?.message ?? '请求失败')
  }
  return json.data as T
}

export function fetchTasks(filters?: Record<string, string>): Promise<Task[]> {
  const params = new URLSearchParams(filters).toString()
  const url = params ? `${BASE}?${params}` : BASE
  return request<Task[]>(url)
}

export function fetchTask(id: string): Promise<Task> {
  return request<Task>(`${BASE}/${id}`)
}

export function createTask(data: Partial<Task> & { title: string }): Promise<Task> {
  return request<Task>(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return request<Task>(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteTask(id: string, cascade = true): Promise<{ deleted: string[] }> {
  return request<{ deleted: string[] }>(
    `${BASE}/${id}?cascade=${cascade}`,
    { method: 'DELETE' }
  )
}

export function updateTaskStatus(id: string, status: Task['status']): Promise<Task> {
  return request<Task>(`${BASE}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function reorderKanban(
  columns: KanbanReorderColumns
): Promise<Task[]> {
  return request<Task[]>(`${BASE}/kanban-reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ columns }),
  })
}

/** 下载导出文件（不走 JSON request 封装） */
export async function exportTasks(payload: ExportTasksPayload): Promise<void> {
  const res = await fetch(`${BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const contentType = res.headers.get('Content-Type') ?? ''
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const json = await res.json()
      throw new Error(json.error?.message ?? '导出失败')
    }
    throw new Error('导出失败')
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition')
  const match = cd?.match(/filename="([^"]+)"/)
  const name = match?.[1] ?? 'solo-task-export'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
