import type { ToolDefinition } from '../providers/types.js'

export const TASK_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: '按状态、优先级、标签、关键词筛选任务列表',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['todo', 'in-progress', 'done', 'archived'],
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
          },
          tag: { type: 'string' },
          q: { type: 'string', description: '搜索标题、描述、标签' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_task',
      description: '根据任务 ID 获取单个任务详情',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_tasks',
      description:
        '组合搜索：关键词、逾期（dueDate 早于今天）、即将到期（N 天内）、状态、优先级',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          overdue: { type: 'boolean', description: '仅逾期任务' },
          dueWithinDays: {
            type: 'number',
            description: 'N 天内到期（含今天）',
          },
          status: { type: 'string' },
          priority: { type: 'string' },
          tag: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: '创建新任务（需用户确认后执行）',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          dueDate: { type: 'string', nullable: true },
          startDate: { type: 'string', nullable: true },
          endDate: { type: 'string', nullable: true },
          parentId: { type: 'string', nullable: true },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: '更新任务字段（需用户确认后执行）',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          dueDate: { type: 'string', nullable: true },
          startDate: { type: 'string', nullable: true },
          endDate: { type: 'string', nullable: true },
          parentId: { type: 'string', nullable: true },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: '删除任务，默认级联删除子任务（需用户确认）',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          cascade: { type: 'boolean', default: true },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task_status',
      description: '快速更新任务状态（需用户确认）',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: {
            type: 'string',
            enum: ['todo', 'in-progress', 'done', 'archived'],
          },
        },
        required: ['id', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reorder_kanban',
      description:
        '重排看板顶层任务：columns 为各状态列的任务 id 数组，自上而下（需用户确认）',
      parameters: {
        type: 'object',
        properties: {
          columns: {
            type: 'object',
            description: '键为 status，值为顶层任务 id 数组',
          },
        },
        required: ['columns'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_tasks',
      description: '导出任务为 json/csv/xlsx/markdown（需用户确认）',
      parameters: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['json', 'csv', 'xlsx', 'markdown'],
          },
          statuses: { type: 'array', items: { type: 'string' } },
          priorities: { type: 'array', items: { type: 'string' } },
          tag: { type: 'string' },
        },
        required: ['format'],
      },
    },
  },
]
