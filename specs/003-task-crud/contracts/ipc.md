# IPC Contracts: 任务 CRUD (003-task-crud)

**Feature**: 003-task-crud
**Date**: 2026-09-18
**Extends**: [001-foundation/contracts/ipc.md](../../001-foundation/contracts/ipc.md)

约定 (包裹格式 / `AppResult` / 错误序列化) 与 001 完全一致,不重复。
本文档只登记 003 新增的 5 个命令与 `Task` DTO。

---

## New Error Variant

```json
{ "ok": false, "error": { "variant": "validation", "message": "title: must be 1..=200 chars" } }
```

`i18nKeyFor` 映射: `validation` → `error.validation` ("输入不符合要求")。

---

## Task DTO

Rust `models.rs` ↔ TypeScript (`src/api/ipc.ts`):

```jsonc
// 单个任务 (所有命令的成功载荷 / 数组元素)
{
  "id": 1,
  "title": "买牛奶",
  "description": "",
  "status": "todo",          // "todo" | "doing" | "done"
  "priority": "none",        // "none" | "low" | "med" | "high"
  "due_at": null,            // RFC3339 string | null
  "created_at": "2026-09-18T08:00:00Z",
  "updated_at": "2026-09-18T08:00:00Z"
}
```

`created_at` / `updated_at` 由 Rust 生成 (UTC, 秒精度 RFC3339)。

---

## Commands

| Command | Args | Returns | Errors |
|---|---|---|---|
| `create_task` | `input: NewTask` | `Task` | `validation` |
| `list_tasks` | — | `Task[]` | `db_locked`, `db_corrupted` |
| `update_task` | `patch: TaskPatch` | `Task` | `validation`, `task_not_found` |
| `set_task_status` | `id: i64, status: String` | `Task` | `validation`, `task_not_found` |
| `delete_task` | `id: i64` | `null` | `task_not_found` |

### `create_task`

```typescript
interface NewTask {
  title: string;           // 必填, trim 后 1..=200 chars
  description?: string;    // 默认 "", ≤5000 chars
  priority?: "none" | "low" | "med" | "high";  // 默认 "none"
  due_at?: string | null;  // RFC3339 | null
}
```

行为: 校验 → INSERT → 返回完整 `Task` (`status='todo'`)。

### `list_tasks`

无参数。返回全部,`ORDER BY created_at DESC, id DESC`。

### `update_task`

```typescript
interface TaskPatch {
  id: number;
  title?: string;          // 传入才更新 (部分更新语义)
  description?: string;
  priority?: "none" | "low" | "med" | "high";
  due_at?: string | null;  // 传 null 显式清空到期日
}
```

行为: 校验传入字段 → `UPDATE ... SET` 动态列 + `updated_at` → 返回
更新后 `Task`。`id` 不存在 → `task_not_found(id)`。

### `set_task_status`

```typescript
// args: { id: number, status: "todo" | "doing" | "done" }
```

行为: 校验 `status` ∈ 三值 → `UPDATE status, updated_at` → 返回
`Task`。`id` 不存在 → `task_not_found(id)`。

### `delete_task`

```typescript
// args: { id: number }
```

行为: `DELETE` → 返回 `null`。`id` 不存在 → `task_not_found(id)`。

---

## Frontend Wrappers (`src/api/ipc.ts`)

```typescript
export function createTask(input: NewTask): Promise<IpcResult<Task>>;
export function listTasks(): Promise<IpcResult<Task[]>>;
export function updateTask(patch: TaskPatch): Promise<IpcResult<Task>>;
export function setTaskStatus(id: number, status: TaskStatus): Promise<IpcResult<Task>>;
export function deleteTask(id: number): Promise<IpcResult<null>>;
```

`i18nKeyFor` 扩展: `validation` → `"error.validation"`。
