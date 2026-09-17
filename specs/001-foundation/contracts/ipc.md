# IPC Contracts: Foundation

**Feature**: 001-foundation
**Date**: 2026-09-17
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Convention

All commands are registered via Tauri 2.x's `#[tauri::command]` macro and
invoked from the frontend with `@tauri-apps/api/core::invoke()`. Every
command returns `AppResult<T>` which Tauri serializes as:

```json
// Success
{ "ok": true,  "data": <T> }
// Failure
{ "ok": false, "error": { "variant": "<snake_case_variant>", "message": "..." } }
```

The frontend wrapper `src/api/ipc.ts` normalizes this shape into a typed
`{ data: T } | { error: AppErrorSerialized }` discriminated union and maps
`AppError` variants to i18n keys (see [data-model.md](data-model.md)).

---

## Commands

| Command | Args | Returns | Used by |
|---|---|---|---|
| `health_check` | — | `Result<HealthStatus, AppError>` where `HealthStatus = { ok: true }` | `App.tsx` startup |
| `export_json` | `path: String` | `Result<ExportSummary, AppError>` | `CorruptedView.tsx` S3 |
| `get_preference` | `key: String` | `Result<PreferenceValue, AppError>` | `Settings.tsx` S6 |
| `set_preference` | `key: String, value: String` | `Result<(), AppError>` | `Settings.tsx` S6 |
| `trigger_test_error` | `variant: String` | `Result<(), AppError>` | `Settings.tsx` S4 debug button |

### `health_check`

Called by `App.tsx` once on mount (after Tauri window is ready).

**Args**: none

**Returns**: `AppResult<HealthStatus>` where

```typescript
interface HealthStatus { ok: true }
```

**Behavior**:
- Opens the SQLite file at the platform-correct path (resolved by
  `paths.rs`)
- Runs `PRAGMA integrity_check`
- If the file does not exist: runs initial migration, then returns `ok: true`
- If integrity check fails: returns `Err(AppError::DbCorrupted)`
- If the DB is locked: returns `Err(AppError::DbLocked)`

**Frontend reaction**:
- `ok: true` → render main AppShell with three view tabs
- `Err(DbCorrupted)` → render `CorruptedView` (S3)
- `Err(DbLocked)` → render error toast + retry button

---

### `export_json`

Called by `CorruptedView` when user clicks "导出为 JSON".

**Args**: `{ path: string }` — absolute file path from native save dialog

**Returns**: `AppResult<ExportSummary>` where

```typescript
interface ExportSummary {
  written_to: string;             // echoes input path
  bytes: number;                  // file size
  warnings: string[];             // forwarded from payload (foundation: ["database_corrupted"])
}
```

**Behavior**:
- Opens native save dialog via `tauri-plugin-dialog` if `path` not provided
- Reads every table via rusqlite (foundation stage: all empty)
- Serializes to `ExportPayload` JSON (see [data-model.md](data-model.md))
- Writes UTF-8 JSON to disk
- Returns summary

**Errors**:
- `PermissionDenied` if path is read-only or outside writable area
- `IoError` for any filesystem error
- `DbLocked` if SQLite read blocks

---

### `trigger_test_error`

Developer-mode helper. Visible only when `import.meta.env.DEV` (Vite's
dev-mode flag) — see plan.md Open Question Q3. Used to verify S4 (IPC
error rendering).

**Args**: `{ variant: 'db_locked' | 'db_corrupted' | 'permission_denied' | 'unknown' }`

**Returns**: `AppResult<()>` — always returns the requested error variant
except for `'db_corrupted'` which returns `Err(AppError::DbCorrupted)` after
no work, and `'db_locked'` after a short delay.

**Behavior**: a switch that returns the requested `AppError`. This is
intentionally trivial — it exists so the frontend test can drive each
variant through the same IPC path.

**Errors**: always returns the variant passed in.

---

### `get_preference`

Read a single user preference from the `user_preferences` table by key.

**Args**: `{ key: String }`

**Returns**: `AppResult<PreferenceValue>` where

```typescript
interface PreferenceValue {
  key: string;
  value: string;        // JSON-encoded for structured values
  updated_at: string;   // ISO8601 UTC
}
```

**Behavior**: SELECT WHERE key = ?. If no row, returns
`Err(AppError::Unknown("preference_not_found: <key>"))`. Used by
`Settings.tsx` to read `theme.mode` on mount.

**Errors**:
- `DbLocked` if SQLite read blocks
- `Unknown(preference_not_found: <key>)` if key missing

---

### `set_preference`

Upsert a single user preference. Creates row if missing, updates if present.

**Args**: `{ key: String, value: String }` — value MUST be JSON-encoded
even for simple strings (e.g. `'"dark"'` for the string `dark`).

**Returns**: `AppResult<()>`

**Behavior**: INSERT … ON CONFLICT(key) DO UPDATE. Wrapped in a
transaction (Principle VII.4 panic-safe). Used by `Settings.tsx` Theme
switcher to persist user choice.

**Errors**:
- `PermissionDenied` if key is in a reserved/blocked set (none defined
  at foundation)
- `IoError` for any filesystem error
- `DbLocked` if SQLite write blocks

---

## TypeScript Surface

The frontend sees a normalized result type:

```typescript
// src/api/ipc.ts
export type IpcResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: AppErrorSerialized };

export type AppErrorSerialized =
  | { variant: 'db_locked';         message: string }
  | { variant: 'db_corrupted';      message: string }
  | { variant: 'task_not_found';    message: string; id: number }
  | { variant: 'permission_denied'; message: string; detail: string }
  | { variant: 'io_error';          message: string; detail: string }
  | { variant: 'unknown';           message: string; detail: string };

export function healthCheck(): Promise<IpcResult<HealthStatus>>;
export function exportJson(path: string): Promise<IpcResult<ExportSummary>>;
export function triggerTestError(variant: AppErrorVariant): Promise<IpcResult<null>>;

export function i18nKeyFor(error: AppErrorSerialized): I18nKey;
// Maps each variant to a user-visible i18n key (see data-model.md table)
```

The frontend **never** displays `error.message` directly to the user —
only the i18n key is rendered (Principle VII.3). The raw message is logged
to console for debugging.

---

## Versioning & Breaking Changes

This is the v1 IPC surface. Adding new commands is non-breaking. Removing
or renaming an existing command or changing a return type is breaking and
requires:
- New spec → plan → tasks cycle
- Bumped `schema_version` in ExportPayload if export shape changes
- Constitution check that Principle V (Rust owns system) is still honored

---

## Out of Scope at Foundation

The following IPC commands will be added by follow-up specs and are NOT
in this contract:

- `task.create`, `task.update`, `task.delete`, `task.list`
- `subtask.*`
- `tag.*`, `task_tag.*`
- `reminder.schedule`, `reminder.list`, `reminder.fire`
- `app.check_for_update` (real implementation; foundation has stub button)
- `app.clear_data` (real implementation; foundation has stub button)

Foundation establishes the IPC pattern; follow-up specs extend it.
