import { Router, Request, Response } from 'express'
import * as taskService from '../services/taskService.js'
import {
  TASK_STATUSES,
  type TaskStatus,
  type KanbanReorderColumns,
} from '../types/task.js'

const router = Router()

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
  const { status, priority, tag } = req.query
  const tasks = await taskService.getAllTasks({
    status: status as string | undefined,
    priority: priority as string | undefined,
    tag: tag as string | undefined,
  })
  res.json({ success: true, data: tasks })
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
