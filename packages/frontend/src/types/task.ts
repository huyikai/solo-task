export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export const KANBAN_STATUSES: TaskStatus[] = [
  'todo',
  'in-progress',
  'done',
  'archived',
]

/** 看板重排请求体：每列顶层任务 id 自上而下 */
export type KanbanReorderColumns = Record<TaskStatus, string[]>

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  /** 同一 status 内看板顺序 */
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

export interface TaskTreeNode extends Task {
  children: TaskTreeNode[]
}
