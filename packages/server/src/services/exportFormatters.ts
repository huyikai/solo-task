import ExcelJS from 'exceljs'
import type { Task } from '../types/task.js'
import {
  TASK_EXPORT_FIELD_KEYS,
  isTaskExportField,
  type ExportQueryParams,
  type TaskExportField,
} from '../types/export.js'

export function resolveExportFields(requested?: string[]): TaskExportField[] {
  if (!requested || requested.length === 0) {
    return [...TASK_EXPORT_FIELD_KEYS]
  }
  const out: TaskExportField[] = []
  for (const k of requested) {
    if (isTaskExportField(k) && !out.includes(k)) out.push(k)
  }
  return out.length > 0 ? out : [...TASK_EXPORT_FIELD_KEYS]
}

function taskToJsonSlice(task: Task, fields: TaskExportField[]): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (const f of fields) {
    if (f === 'tags') {
      o.tags = task.tags
    } else {
      o[f] = task[f as keyof Task]
    }
  }
  return o
}

function cellString(task: Task, f: TaskExportField): string {
  if (f === 'tags') return task.tags.join(';')
  const v = task[f]
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return String(v)
  return String(v)
}

/** RFC 4180：必要时加引号，内部 " 加倍 */
function escapeCsvField(s: string): string {
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function escapeMdCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

export function buildJsonExport(
  tasks: Task[],
  fields: TaskExportField[],
  query: ExportQueryParams
): Buffer {
  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      query,
    },
    tasks: tasks.map(t => taskToJsonSlice(t, fields)),
  }
  return Buffer.from(JSON.stringify(payload, null, 2), 'utf-8')
}

export function buildCsvExport(tasks: Task[], fields: TaskExportField[]): Buffer {
  const lines: string[] = []
  const header = fields.map(f => escapeCsvField(f)).join(',')
  lines.push(header)
  for (const task of tasks) {
    const row = fields.map(f => escapeCsvField(cellString(task, f))).join(',')
    lines.push(row)
  }
  const text = lines.join('\r\n')
  // UTF-8 BOM，便于 Excel 识别中文
  return Buffer.from('\uFEFF' + text, 'utf-8')
}

export function buildMarkdownExport(tasks: Task[], fields: TaskExportField[]): Buffer {
  const header = `| ${fields.map(f => escapeMdCell(f)).join(' | ')} |`
  const sep = `| ${fields.map(() => '---').join(' | ')} |`
  const rows = tasks.map(task => {
    const cells = fields.map(f => escapeMdCell(cellString(task, f)))
    return `| ${cells.join(' | ')} |`
  })
  const md = [header, sep, ...rows].join('\n')
  return Buffer.from(md, 'utf-8')
}

export async function buildXlsxExport(
  tasks: Task[],
  fields: TaskExportField[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('tasks', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  ws.addRow(fields.map(f => f))
  for (const task of tasks) {
    ws.addRow(fields.map(f => cellString(task, f)))
  }
  ws.getRow(1).font = { bold: true }
  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
