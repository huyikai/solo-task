const READ_TOOLS = new Set(['list_tasks', 'get_task', 'search_tasks'])

const WRITE_TOOLS = new Set([
  'create_task',
  'update_task',
  'delete_task',
  'update_task_status',
  'reorder_kanban',
  'export_tasks',
])

export function isReadTool(name: string): boolean {
  return READ_TOOLS.has(name)
}

export function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name)
}

export function isKnownTool(name: string): boolean {
  return isReadTool(name) || isWriteTool(name)
}
