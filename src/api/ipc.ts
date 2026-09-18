// Typed Tauri IPC wrappers per contracts/ipc.md.
// Every command returns AppResult<T>; this layer normalizes the
// serialized shape into a discriminated union and maps AppError
// variants to i18n keys (Constitution Principle VII.3).

import { invoke } from "@tauri-apps/api/core";
import type { I18nKey } from "@/i18n/t";

export interface HealthStatus {
  ok: true;
}

export interface ExportSummary {
  written_to: string;
  bytes: number;
  warnings: string[];
}

export interface PreferenceValue {
  key: string;
  value: string;
  updated_at: string;
}

export type AppErrorVariant =
  | "db_locked"
  | "db_corrupted"
  | "task_not_found"
  | "validation"
  | "permission_denied"
  | "io_error"
  | "unknown";

export interface AppErrorSerialized {
  variant: AppErrorVariant;
  message?: string;
}

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppErrorSerialized };

export function i18nKeyFor(error: AppErrorSerialized): I18nKey {
  switch (error.variant) {
    case "db_locked":
      return "error.db_locked";
    case "db_corrupted":
      return "error.db_corrupted";
    case "permission_denied":
      return "error.permission_denied";
    case "validation":
      return "error.validation";
    case "task_not_found":
    case "io_error":
    case "unknown":
      return "error.unknown";
  }
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<IpcResult<T>> {
  try {
    const data = await invoke<T>(command, args);
    return { ok: true, data };
  } catch (raw) {
    return { ok: false, error: normalizeError(raw) };
  }
}

function normalizeError(raw: unknown): AppErrorSerialized {
  // Rust 序列化的 AppError: { variant: "...", message: "..." }
  if (typeof raw === "object" && raw !== null && "variant" in raw) {
    const e = raw as { variant: string; message?: string };
    const known: AppErrorVariant[] = [
      "db_locked",
      "db_corrupted",
      "task_not_found",
      "validation",
      "permission_denied",
      "io_error",
      "unknown",
    ];
    if (known.includes(e.variant as AppErrorVariant)) {
      return { variant: e.variant as AppErrorVariant, message: e.message };
    }
  }
  return { variant: "unknown", message: String(raw) };
}

export function healthCheck(): Promise<IpcResult<HealthStatus>> {
  return call<HealthStatus>("health_check");
}

export function exportJson(path: string): Promise<IpcResult<ExportSummary>> {
  return call<ExportSummary>("export_json", { path });
}

export function getPreference(key: string): Promise<IpcResult<PreferenceValue>> {
  return call<PreferenceValue>("get_preference", { key });
}

export function setPreference(key: string, value: string): Promise<IpcResult<null>> {
  return call<null>("set_preference", { key, value });
}

// --- 任务 CRUD (spec 003, contracts/ipc.md) ---

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "none" | "low" | "med" | "high";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_at?: string | null;
}

export interface TaskPatchInput {
  id: number;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  /** JSON null → 显式清空; 缺省 → 不动 */
  due_at?: string | null;
}

export function createTask(input: NewTaskInput): Promise<IpcResult<Task>> {
  return call<Task>("create_task", { input });
}

export function listTasks(): Promise<IpcResult<Task[]>> {
  return call<Task[]>("list_tasks");
}

export function updateTask(patch: TaskPatchInput): Promise<IpcResult<Task>> {
  return call<Task>("update_task", { patch });
}

export function setTaskStatus(id: number, status: TaskStatus): Promise<IpcResult<Task>> {
  return call<Task>("set_task_status", { id, status });
}

export function deleteTask(id: number): Promise<IpcResult<null>> {
  return call<null>("delete_task", { id });
}

export type TestErrorVariant = Extract<
  AppErrorVariant,
  "db_locked" | "db_corrupted" | "permission_denied" | "unknown"
>;

export function triggerTestError(variant: TestErrorVariant): Promise<IpcResult<null>> {
  return call<null>("trigger_test_error", { variant });
}
