import { Router, Request, Response } from 'express'
import * as taskService from '../services/taskService.js'
import {
  buildCsvExport,
  buildJsonExport,
  buildMarkdownExport,
  buildXlsxExport,
  resolveExportFields,
} from '../services/exportFormatters.js'
import {
  EXPORT_DATE_FIELDS,
  TASK_PRIORITIES,
  type ExportDateField,
  type ExportQueryParams,
  type ExportFormat,
} from '../types/export.js'
import {
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
  type KanbanReorderColumns,
} from '../types/task.js'

const router = Router()

const EXPORT_FORMATS: ExportFormat[] = ['json', 'csv', 'xlsx', 'markdown']

function paramId(req: Request): string {
  const id = req.params.id
  return Array.isArray(id) ? id[0] : id
}

router.patch('/kanban-reorder', async (req: Request, res: Response) => {
  const raw = req.body?.columns
  if (!raw || typeof raw !== 'object') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '缺少 columns' },
    })
    return
  }
  const columns: Partial<Record<TaskStatus, unknown>> = raw
  for (const s of TASK_STATUSES) {
    if (!Array.isArray(columns[s])) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `columns.${s} 必须为数组`,
        },
      })
      return
    }
    for (const id of columns[s] as unknown[]) {
      if (typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '任务 id 无效' },
        })
        return
      }
    }
  }
  try {
    const data = await taskService.reorderKanban(columns as KanbanReorderColumns)
    res.json({ success: true, data })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '重排失败'
    const map: Record<string, string> = {
      DUPLICATE_ID: '任务 id 重复',
      NOT_FOUND: '任务不存在',
      NOT_TOP_LEVEL: '仅顶层任务可参与看板排序',
      TOP_LEVEL_MISMATCH: '顶层任务列表与看板不一致',
      INVALID_COLUMNS: 'columns 无效',
    }
    res.status(400).json({
      success: false,
      error: {
        code: 'KANBAN_REORDER_ERROR',
        message: map[msg] ?? msg,
      },
    })
  }
})

router.get('/', async (req: Request, res: Response) => {
  const { status, priority, tag, q } = req.query
  const tasks = await taskService.getAllTasks({
    status: status as string | undefined,
    priority: priority as string | undefined,
    tag: tag as string | undefined,
    q:
      typeof q === 'string'
        ? q
        : Array.isArray(q) && typeof q[0] === 'string'
          ? q[0]
          : undefined,
  })
  res.json({ success: true, data: tasks })
})

router.post('/export', async (req: Request, res: Response) => {
  const body = req.body
  if (!body || typeof body !== 'object') {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '请求体无效' },
    })
    return
  }

  const format = body.format as string
  if (!EXPORT_FORMATS.includes(format as ExportFormat)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'format 须为 json、csv、xlsx、markdown 之一',
      },
    })
    return
  }

  const fields = resolveExportFields(
    Array.isArray(body.fields) ? (body.fields as string[]) : undefined
  )

  let statuses: TaskStatus[] | undefined
  if (body.statuses !== undefined && body.statuses !== null) {
    if (!Array.isArray(body.statuses)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'statuses 须为数组' },
      })
      return
    }
    for (const s of body.statuses) {
      if (typeof s !== 'string' || !TASK_STATUSES.includes(s as TaskStatus)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'statuses 含有无效状态' },
        })
        return
      }
    }
    statuses = body.statuses as TaskStatus[]
  }

  let priorities: TaskPriority[] | undefined
  if (body.priorities !== undefined && body.priorities !== null) {
    if (!Array.isArray(body.priorities)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'priorities 须为数组' },
      })
      return
    }
    for (const p of body.priorities) {
      if (typeof p !== 'string' || !TASK_PRIORITIES.includes(p as TaskPriority)) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'priorities 含有无效优先级' },
        })
        return
      }
    }
    priorities = body.priorities as TaskPriority[]
  }

  let tag: string | undefined
  if (body.tag !== undefined && body.tag !== null) {
    if (typeof body.tag !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tag 须为字符串' },
      })
      return
    }
    tag = body.tag
  }

  let dateRange: ExportQueryParams['dateRange']
  if (body.dateRange !== undefined && body.dateRange !== null) {
    const dr = body.dateRange
    if (typeof dr !== 'object' || Array.isArray(dr)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'dateRange 无效' },
      })
      return
    }
    const field = (dr as { field?: string }).field
    if (!field || typeof field !== 'string' || !EXPORT_DATE_FIELDS.includes(field as (typeof EXPORT_DATE_FIELDS)[number])) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'dateRange.field 无效' },
      })
      return
    }
    const from = (dr as { from?: unknown }).from
    const to = (dr as { to?: unknown }).to
    if (from !== undefined && from !== null && typeof from !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'dateRange.from 须为字符串' },
      })
      return
    }
    if (to !== undefined && to !== null && typeof to !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'dateRange.to 须为字符串' },
      })
      return
    }
    dateRange = {
      field: field as ExportDateField,
      from: typeof from === 'string' ? from : undefined,
      to: typeof to === 'string' ? to : undefined,
    }
  }

  const queryParams: ExportQueryParams = {}
  if (statuses && statuses.length > 0) queryParams.statuses = statuses
  if (priorities && priorities.length > 0) queryParams.priorities = priorities
  if (tag && tag.trim()) queryParams.tag = tag.trim()
  if (dateRange) queryParams.dateRange = dateRange

  try {
    const tasks = await taskService.queryTasksForExport(queryParams)

    switch (format as ExportFormat) {
      case 'json': {
        const buf = buildJsonExport(tasks, fields, queryParams)
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="solo-task-export.json"'
        )
        res.send(buf)
        return
      }
      case 'csv': {
        const buf = buildCsvExport(tasks, fields)
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="solo-task-export.csv"'
        )
        res.send(buf)
        return
      }
      case 'markdown': {
        const buf = buildMarkdownExport(tasks, fields)
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="solo-task-export.md"'
        )
        res.send(buf)
        return
      }
      case 'xlsx': {
        const buf = await buildXlsxExport(tasks, fields)
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="solo-task-export.xlsx"'
        )
        res.send(buf)
        return
      }
      default: {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '不支持的 format' },
        })
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '导出失败'
    res.status(500).json({
      success: false,
      error: { code: 'EXPORT_ERROR', message: msg },
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const task = await taskService.getTaskById(paramId(req))
  if (!task) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '任务不存在' },
    })
    return
  }
  res.json({ success: true, data: task })
})

router.post('/', async (req: Request, res: Response) => {
  const { title } = req.body
  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '任务标题不能为空' },
    })
    return
  }
  const task = await taskService.createTask(req.body)
  res.status(201).json({ success: true, data: task })
})

router.put('/:id', async (req: Request, res: Response) => {
  const updated = await taskService.updateTask(paramId(req), req.body)
  if (!updated) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '任务不存在' },
    })
    return
  }
  res.json({ success: true, data: updated })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const cascade = req.query.cascade !== 'false'
  const deleted = await taskService.deleteTask(paramId(req), cascade)
  if (deleted.length === 0) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '任务不存在' },
    })
    return
  }
  res.json({ success: true, data: { deleted } })
})

router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body
  const valid = ['todo', 'in-progress', 'done', 'archived']
  if (!status || !valid.includes(status)) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '无效的状态值' },
    })
    return
  }
  const updated = await taskService.updateTaskStatus(paramId(req), status)
  if (!updated) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '任务不存在' },
    })
    return
  }
  res.json({ success: true, data: updated })
})

export default router
