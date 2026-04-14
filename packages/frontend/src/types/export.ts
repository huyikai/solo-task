import type { TaskPriority, TaskStatus } from './task'

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

export interface ExportTasksPayload {
  format: ExportFormat
  fields?: string[]
  statuses?: TaskStatus[]
  priorities?: TaskPriority[]
  tag?: string
  dateRange?: {
    field: ExportDateField
    from?: string
    to?: string
  }
}
