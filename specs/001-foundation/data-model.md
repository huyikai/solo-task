# Data Model: Foundation

**Feature**: 001-foundation
**Date**: 2026-09-17
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## SQLite Schema (Initial Migration v1)

The initial migration runs on app startup when `migrations` table records no
applied version, OR when the DB file does not exist. Six tables are created
(all empty at foundation stage; data population belongs to follow-up specs).

```sql
-- Migration metadata (used by rusqlite migrations-style runner)
CREATE TABLE migrations (
  version     INTEGER PRIMARY KEY NOT NULL,
  applied_at  TEXT    NOT NULL,            -- ISO8601 UTC
  description TEXT    NOT NULL
);

-- User preferences (key-value store for app-wide settings)
CREATE TABLE user_preferences (
  key        TEXT    PRIMARY KEY NOT NULL,  -- e.g. 'theme.mode'
  value      TEXT    NOT NULL,              -- JSON-encoded or plain text
  updated_at TEXT    NOT NULL
);

-- Tasks: filled in by follow-up specs (basic CRUD)
CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  status      TEXT    NOT NULL DEFAULT 'todo',  -- 'todo' | 'doing' | 'done'
  priority    TEXT    NOT NULL DEFAULT 'none',  -- 'none' | 'low' | 'med' | 'high'
  due_at      TEXT,                              -- nullable ISO8601
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

-- Subtasks: parent/child relation to tasks
CREATE TABLE subtasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,        -- 0 | 1 (SQLite has no bool)
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

-- Tags: many-to-many with tasks via task_tags
CREATE TABLE tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL UNIQUE
);

-- Task-tag join table
CREATE TABLE task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Reminders: out of scope at foundation (empty), schema defined for follow-up
CREATE TABLE reminders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  fire_at     TEXT    NOT NULL,                  -- ISO8601
  recurrence  TEXT,                              -- nullable RRULE-ish string
  fired       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL
);

-- Record that v1 has been applied
INSERT INTO migrations (version, applied_at, description)
VALUES (1, '<utc-iso8601>', 'initial foundation schema: empty tables');

-- Seed default preferences
INSERT INTO user_preferences (key, value, updated_at) VALUES
  ('theme.mode', '"system"', '<utc-iso8601>');
```

**Validation rules** (enforced in follow-up specs; schema leaves room):
- `tasks.status` ∈ {'todo', 'doing', 'done'} — enforced via CHECK constraint
  in follow-up migration
- `tasks.priority` ∈ {'none', 'low', 'med', 'high'}
- `reminders.recurrence` format: deferred to reminders spec
- `user_preferences.key`: known set is currently `theme.mode` only
- `user_preferences.value` for `theme.mode`: JSON-encoded string ∈
  `'"system"'`, `'"light"'`, `'"dark"'`

**State transitions** (foundation: none; tasks table is empty)

---

## AppError (Cross-IPC Contract)

Defined in Rust (`src-tauri/src/error.rs`), serialized across IPC.

```rust
#[derive(Debug, thiserror::Error, serde::Serialize)]
#[serde(rename_all = "snake_case", tag = "variant", content = "message")]
pub enum AppError {
    #[error("database is locked by another process")]
    DbLocked,
    #[error("database file is corrupted")]
    DbCorrupted,
    #[error("task not found: {0}")]
    TaskNotFound(i64),
    #[error("permission denied: {0}")]
    PermissionDenied(String),
    #[error("io error: {0}")]
    IoError(String),
    #[error("unknown error: {0}")]
    Unknown(String),
}

pub type AppResult<T> = Result<T, AppError>;
```

**IPC serialization shape** (Tauri returns it via `Result<T, AppError>`):

```json
// Success
{ "ok": true, "data": <T> }
// Error
{ "ok": false, "error": { "variant": "db_locked", "message": "..." } }
```

**Frontend mapping** (`src/api/ipc.ts`) maps each variant to an i18n key:

| Variant | i18n key | UX behavior |
|---|---|---|
| `db_locked` | `error.db_locked` | Toast + retry button |
| `db_corrupted` | `error.db_corrupted` | Switch app to CorruptedView (S3) |
| `task_not_found` | `error.unknown` (with `data: { hint: 'task_missing' }`) | Toast, log |
| `permission_denied` | `error.permission_denied` | Banner on relevant view |
| `io_error` | `error.unknown` | Toast, log full error to console |
| `unknown` | `error.unknown` | Toast, log |

Rationale: principle VII.3 — never expose internal stacks; surface variant,
not message.

---

## ExportPayload (JSON Escape Hatch)

Defined in Rust, written by `export_json` command. Foundation stage writes
the placeholder shape (empty arrays + `warnings` field); follow-up specs
populate the arrays.

```typescript
interface ExportPayload {
  schema_version: 1;             // bump on shape change
  exported_at: string;           // ISO8601 UTC
  tasks: Task[];                 // empty at foundation
  subtasks: Subtask[];           // empty at foundation
  tags: Tag[];                   // empty at foundation
  reminders: Reminder[];         // empty at foundation
  warnings: string[];            // e.g. ["database_corrupted"]
}

interface Task    { /* fields per follow-up CRUD spec */ }
interface Subtask { /* ... */ }
interface Tag     { /* ... */ }
interface Reminder{ /* ... */ }
```

Foundation exports look like:

```json
{
  "schema_version": 1,
  "exported_at": "2026-09-17T10:00:00Z",
  "tasks": [],
  "subtasks": [],
  "tags": [],
  "reminders": [],
  "warnings": ["database_corrupted"]
}
```

---

## I18nKey Set

Foundation requires the following i18n keys (`src/i18n/zh-CN.ts`):

```typescript
export type I18nKey =
  | 'app.title'
  | 'views.list'
  | 'views.board'
  | 'views.gantt'
  | 'views.placeholder'
  | 'settings.title'
  | 'settings.check_for_update'
  | 'settings.checking'
  | 'settings.no_update'
  | 'settings.clear_data'
  | 'settings.confirm_clear_title'
  | 'settings.confirm_clear_message'
  | 'settings.confirm_clear_placeholder'
  | 'settings.confirm_clear_button'
  | 'settings.cancel'
  | 'corrupted.title'
  | 'corrupted.message'
  | 'corrupted.export'
  | 'corrupted.exporting'
  | 'corrupted.export_success'
  | 'error.db_locked'
  | 'error.db_corrupted'
  | 'error.permission_denied'
  | 'error.unknown';
```

`src/i18n/t.ts` lookup signature:

```typescript
export function t(key: I18nKey, vars?: Record<string, string | number>): string;
```

Missing-key behavior (FR-008): returns `"<missing:key>"` and logs a warning
in dev mode (`import.meta.env.DEV`). Production silently returns the key.

---

## DB File Path (Foundation-stage contract)

Resolved in `src-tauri/src/paths.rs` via the `dirs` crate:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/com.huyikai.solo-task/tasks.db` |
| Windows | `%APPDATA%\com.huyikai.solo-task\tasks.db` |

Parent directory is created on first run if missing. `dirs::data_dir()` is
the single source of truth — no platform-specific code paths in commands.
