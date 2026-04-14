export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'archived'

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done', 'archived']

/** 看板重排：每列顶层任务 id 自上而下 */
export type KanbanReorderColumns = Record<TaskStatus, string[]>
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  /** 同一 status 内看板顺序，自 0 递增 */
  boardOrder: number
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
  boardOrder?: number
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
  boardOrder?: number
  priority?: TaskPriority
  tags?: string[]
  dueDate?: string | null
  startDate?: string | null
  endDate?: string | null
  parentId?: string | null
}
