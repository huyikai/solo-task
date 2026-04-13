export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  tags: string[]
  dueDate: string | null
  startDate: string | null
  endDate: string | null
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  tags?: string[]
  dueDate?: string | null
  startDate?: string | null
  endDate?: string | null
  parentId?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  tags?: string[]
  dueDate?: string | null
  startDate?: string | null
  endDate?: string | null
  parentId?: string | null
}
