import type { TaskPriority, TaskStatus } from './task.js'

export const TASK_PRIORITIES: TaskPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
]

export type ExportFormat = 'json' | 'csv' | 'xlsx' | 'markdown'

export type ExportDateField =
  | 'createdAt'
  | 'updatedAt'
  | 'dueDate'
  | 'startDate'
  | 'endDate'

export const EXPORT_DATE_FIELDS: ExportDateField[] = [
  'createdAt',
  'updatedAt',
  'dueDate',
  'startDate',
  'endDate',
]

export const TASK_EXPORT_FIELD_KEYS = [
  'id',
  'title',
  'description',
  'status',
  'boardOrder',
  'priority',
  'tags',
  'dueDate',
  'startDate',
  'endDate',
  'parentId',
  'createdAt',
  'updatedAt',
] as const

export type TaskExportField = (typeof TASK_EXPORT_FIELD_KEYS)[number]

export function isTaskExportField(s: string): s is TaskExportField {
  return (TASK_EXPORT_FIELD_KEYS as readonly string[]).includes(s)
}

export interface ExportDateRange {
  from?: string
  to?: string
  field: ExportDateField
}

export interface ExportQueryParams {
  statuses?: TaskStatus[]
  priorities?: TaskPriority[]
  /** 匹配任务 tags 中包含该字符串的标签（精确匹配列表中的一项） */
  tag?: string
  dateRange?: ExportDateRange
}
