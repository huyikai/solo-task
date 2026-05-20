import * as taskService from '../../services/taskService.js'
import {
  buildCsvExport,
  buildJsonExport,
  buildMarkdownExport,
  buildXlsxExport,
  resolveExportFields,
} from '../../services/exportFormatters.js'
import type { ExportFormat, ExportQueryParams } from '../../types/export.js'
import type { Task, TaskStatus, KanbanReorderColumns } from '../../types/task.js'
import { TASK_STATUSES } from '../../types/task.js'
import type { PendingAction } from '../sessionStore.js'
import { isReadTool, isWriteTool } from './classify.js'

const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  'in-progress': '进行中',
  done: '已完成',
  archived: '归档',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export async function searchTasks(args: Record<string, unknown>): Promise<Task[]> {
  let tasks = await taskService.getAllTasks({
    status: typeof args.status === 'string' ? args.status : undefined,
    priority: typeof args.priority === 'string' ? args.priority : undefined,
    tag: typeof args.tag === 'string' ? args.tag : undefined,
    q: typeof args.q === 'string' ? args.q : undefined,
  })

  const today = startOfDay(new Date())

  if (args.overdue === true) {
    tasks = tasks.filter(t => {
      if (!t.dueDate) return false
      const due = startOfDay(new Date(t.dueDate))
      return due < today && t.status !== 'done' && t.status !== 'archived'
    })
  }

  if (typeof args.dueWithinDays === 'number' && args.dueWithinDays >= 0) {
    const end = new Date(today)
    end.setDate(end.getDate() + args.dueWithinDays)
    tasks = tasks.filter(t => {
      if (!t.dueDate) return false
      const due = startOfDay(new Date(t.dueDate))
      return due >= today && due <= end
    })
  }

  return tasks
}

export interface ReadToolResult {
  summary: string
  data: unknown
}

export async function executeReadTool(
  name: string,
  args: Record<string, unknown>
): Promise<ReadToolResult> {
  switch (name) {
    case 'list_tasks': {
      const tasks = await taskService.getAllTasks({
        status: typeof args.status === 'string' ? args.status : undefined,
        priority: typeof args.priority === 'string' ? args.priority : undefined,
        tag: typeof args.tag === 'string' ? args.tag : undefined,
        q: typeof args.q === 'string' ? args.q : undefined,
      })
      return {
        summary: `找到 ${tasks.length} 个任务`,
        data: tasks.map(compactTask),
      }
    }
    case 'get_task': {
      const id = String(args.id ?? '')
      const task = await taskService.getTaskById(id)
      if (!task) {
        return { summary: '任务不存在', data: null }
      }
      const all = await taskService.getAllTasks()
      const childCount = all.filter(t => t.parentId === id).length
      return {
        summary: `任务「${task.title}」${childCount > 0 ? `，含 ${childCount} 个子任务` : ''}`,
        data: compactTask(task),
      }
    }
    case 'search_tasks': {
      const tasks = await searchTasks(args)
      return {
        summary: `搜索到 ${tasks.length} 个任务`,
        data: tasks.map(compactTask),
      }
    }
    default:
      throw new Error(`未知只读工具: ${name}`)
  }
}

export interface CompactTask {
  id: string
  title: string
  status: TaskStatus
  priority: Task['priority']
  tags: string[]
  dueDate: string | null
  startDate: string | null
  endDate: string | null
  parentId: string | null
}

function compactTask(t: Task): CompactTask {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    tags: t.tags,
    dueDate: t.dueDate,
    startDate: t.startDate,
    endDate: t.endDate,
    parentId: t.parentId,
  }
}

/** 从最近 tool 消息生成 Markdown 列表（小模型无第二轮回复时的兜底） */
export function formatReadResultAsMarkdown(history: { role: string; content: string }[]): string {
  const toolMsgs = [...history].reverse().filter(m => m.role === 'tool')
  if (toolMsgs.length === 0) return ''

  const last = toolMsgs[0]
  let data: unknown
  try {
    data = JSON.parse(last.content)
  } catch {
    return ''
  }

  const tasks: CompactTask[] = Array.isArray(data)
    ? (data as CompactTask[])
    : data && typeof data === 'object'
      ? [data as CompactTask]
      : []

  if (tasks.length === 0) {
    return '未找到匹配的任务。'
  }

  const lines = tasks.slice(0, 30).map(t => {
    const status = STATUS_LABELS[t.status] ?? t.status
    const priority = PRIORITY_LABELS[t.priority] ?? t.priority
    const due = t.dueDate ? `，截止 ${t.dueDate.slice(0, 10)}` : ''
    return `- **${t.title}**（${status} · ${priority}${due}）`
  })
  if (tasks.length > 30) {
    lines.push(`\n… 还有 ${tasks.length - 30} 条未显示`)
  }
  return `共 ${tasks.length} 条：\n\n${lines.join('\n')}`
}

export function buildPendingAction(
  name: string,
  args: Record<string, unknown>
): Omit<PendingAction, 'id'> {
  switch (name) {
    case 'create_task': {
      const title = String(args.title ?? '')
      return {
        type: name,
        summary: `创建任务「${title}」`,
        diff: { ...args },
        payload: { tool: name, args },
      }
    }
    case 'update_task': {
      const id = String(args.id ?? '')
      return {
        type: name,
        summary: `更新任务 ${id}`,
        diff: { ...args },
        payload: { tool: name, args },
      }
    }
    case 'delete_task': {
      const id = String(args.id ?? '')
      const cascade = args.cascade !== false
      return {
        type: name,
        summary: `删除任务 ${id}${cascade ? '（含子任务）' : ''}`,
        diff: { id, cascade },
        payload: { tool: name, args: { id, cascade } },
      }
    }
    case 'update_task_status': {
      const id = String(args.id ?? '')
      const status = String(args.status ?? '')
      return {
        type: name,
        summary: `将任务 ${id} 设为「${STATUS_LABELS[status] ?? status}」`,
        diff: { id, status },
        payload: { tool: name, args: { id, status } },
      }
    }
    case 'reorder_kanban': {
      return {
        type: name,
        summary: '重排看板列顺序',
        diff: { columns: args.columns },
        payload: { tool: name, args },
      }
    }
    case 'export_tasks': {
      const format = String(args.format ?? 'json')
      return {
        type: name,
        summary: `导出任务为 ${format.toUpperCase()}`,
        diff: { ...args },
        payload: { tool: name, args },
      }
    }
    default:
      throw new Error(`未知写工具: ${name}`)
  }
}

export async function executeWriteAction(
  action: PendingAction
): Promise<{ ok: boolean; message: string; data?: unknown }> {
  const { tool, args } = action.payload as {
    tool: string
    args: Record<string, unknown>
  }

  if (!isWriteTool(tool)) {
    return { ok: false, message: '非写操作' }
  }

  try {
    switch (tool) {
      case 'create_task': {
        const title = String(args.title ?? '').trim()
        if (!title) return { ok: false, message: '标题不能为空' }
        const task = await taskService.createTask({
          title,
          description:
            typeof args.description === 'string' ? args.description : undefined,
          status: args.status as Task['status'] | undefined,
          priority: args.priority as Task['priority'] | undefined,
          tags: Array.isArray(args.tags) ? (args.tags as string[]) : undefined,
          dueDate: args.dueDate as string | null | undefined,
          startDate: args.startDate as string | null | undefined,
          endDate: args.endDate as string | null | undefined,
          parentId: args.parentId as string | null | undefined,
        })
        return { ok: true, message: `已创建「${task.title}」`, data: task }
      }
      case 'update_task': {
        const id = String(args.id ?? '')
        const { id: _id, ...rest } = args
        const updated = await taskService.updateTask(id, rest)
        if (!updated) return { ok: false, message: '任务不存在' }
        return { ok: true, message: `已更新「${updated.title}」`, data: updated }
      }
      case 'delete_task': {
        const id = String(args.id ?? '')
        const cascade = args.cascade !== false
        const all = await taskService.getAllTasks()
        const childCount = all.filter(t => t.parentId === id).length
        const deleted = await taskService.deleteTask(id, cascade)
        if (deleted.length === 0) return { ok: false, message: '任务不存在' }
        return {
          ok: true,
          message: `已删除 ${deleted.length} 个任务${childCount > 0 ? `（含子任务）` : ''}`,
          data: { deleted },
        }
      }
      case 'update_task_status': {
        const id = String(args.id ?? '')
        const status = args.status as TaskStatus
        const updated = await taskService.updateTaskStatus(id, status)
        if (!updated) return { ok: false, message: '任务不存在' }
        return {
          ok: true,
          message: `已将「${updated.title}」设为 ${STATUS_LABELS[status] ?? status}`,
          data: updated,
        }
      }
      case 'reorder_kanban': {
        const columns = args.columns as KanbanReorderColumns
        for (const s of TASK_STATUSES) {
          if (!Array.isArray(columns[s])) {
            return { ok: false, message: `columns.${s} 无效` }
          }
        }
        await taskService.reorderKanban(columns)
        return { ok: true, message: '看板已重排' }
      }
      case 'export_tasks': {
        const format = String(args.format ?? 'json') as ExportFormat
        const queryParams: ExportQueryParams = {}
        if (Array.isArray(args.statuses) && args.statuses.length > 0) {
          queryParams.statuses = args.statuses as TaskStatus[]
        }
        if (Array.isArray(args.priorities) && args.priorities.length > 0) {
          queryParams.priorities = args.priorities as Task['priority'][]
        }
        if (typeof args.tag === 'string' && args.tag.trim()) {
          queryParams.tag = args.tag.trim()
        }
        const tasks = await taskService.queryTasksForExport(queryParams)
        const fields = resolveExportFields(undefined)
        let size = 0
        switch (format) {
          case 'json':
            size = buildJsonExport(tasks, fields, queryParams).length
            break
          case 'csv':
            size = buildCsvExport(tasks, fields).length
            break
          case 'markdown':
            size = buildMarkdownExport(tasks, fields).length
            break
          case 'xlsx':
            size = (await buildXlsxExport(tasks, fields)).length
            break
        }
        return {
          ok: true,
          message: `已导出 ${tasks.length} 条任务（${format}，约 ${Math.round(size / 1024)} KB）`,
          data: { format, taskCount: tasks.length, sizeBytes: size },
        }
      }
      default:
        return { ok: false, message: '未知操作' }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '执行失败'
    return { ok: false, message: msg }
  }
}

export function summarizeToolForDisplay(name: string, args: Record<string, unknown>): string {
  if (isReadTool(name)) return `查询: ${name}`
  if (isWriteTool(name)) return buildPendingAction(name, args).summary
  return name
}
