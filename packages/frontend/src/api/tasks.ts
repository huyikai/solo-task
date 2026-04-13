import type { Task } from '../types/task'

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
