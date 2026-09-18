use crate::error::{AppError, AppResult};
use crate::models::{Task, TaskPriority, TaskStatus};
use crate::repo::tasks::{self, NewTaskRow, TaskPatchRow};
use chrono::{SecondsFormat, Utc};
use rusqlite::Connection;
use serde::Deserialize;

/// IPC 输入: 创建任务 (contracts/ipc.md)。缺省字段走 serde default。
#[derive(Debug, Deserialize)]
pub struct NewTaskInput {
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub priority: Option<TaskPriority>,
    #[serde(default)]
    pub due_at: Option<String>,
}

/// IPC 输入: 部分更新。`due_at: null` (JSON) → `Some(None)` 显式清空;
/// 字段缺省 → `None` 不动 (contracts/ipc.md)。
#[derive(Debug, Deserialize)]
pub struct TaskPatchInput {
    pub id: i64,
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<TaskPriority>,
    pub due_at: Option<Option<String>>,
}

// --- 校验 (FR-006): 全部在 Rust 端, 返回 Validation ---

fn validate_title(raw: &str) -> AppResult<String> {
    let trimmed = raw.trim();
    let chars = trimmed.chars().count();
    if chars == 0 || chars > 200 {
        return Err(AppError::Validation(
            "title: must be 1..=200 characters".into(),
        ));
    }
    Ok(trimmed.to_string())
}

fn validate_description(raw: &str) -> AppResult<()> {
    if raw.chars().count() > 5000 {
        return Err(AppError::Validation(
            "description: max 5000 characters".into(),
        ));
    }
    Ok(())
}

fn validate_due_at(raw: Option<&str>) -> AppResult<Option<String>> {
    match raw {
        None => Ok(None),
        Some(s) => {
            chrono::DateTime::parse_from_rfc3339(s).map_err(|_| {
                AppError::Validation("due_at: must be a valid RFC3339 timestamp".into())
            })?;
            Ok(Some(s.to_string()))
        }
    }
}

fn parse_status(raw: &str) -> AppResult<TaskStatus> {
    TaskStatus::parse(raw)
        .ok_or_else(|| AppError::Validation(format!("status: unknown value '{raw}'")))
}

/// UTC RFC3339, 秒精度, 始终 Z 后缀 (plan.md R2)。
fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

// --- 用例入口 (可测, 连接注入) ---

pub fn create(conn: &Connection, input: NewTaskInput) -> AppResult<Task> {
    let title = validate_title(&input.title)?;
    validate_description(&input.description)?;
    let due_at = validate_due_at(input.due_at.as_deref())?;
    let priority = input.priority.unwrap_or(TaskPriority::None);
    let ts = now();

    tasks::insert_task(
        conn,
        &NewTaskRow {
            title: &title,
            description: &input.description,
            priority,
            due_at: due_at.as_deref(),
            created_at: &ts,
            updated_at: &ts,
        },
    )
}

pub fn list(conn: &Connection) -> AppResult<Vec<Task>> {
    tasks::list_tasks(conn)
}

pub fn update(conn: &Connection, patch: TaskPatchInput) -> AppResult<Task> {
    let title = match &patch.title {
        Some(t) => Some(validate_title(t)?),
        None => None,
    };
    if let Some(d) = &patch.description {
        validate_description(d)?;
    }
    let due_at = match &patch.due_at {
        None => None,
        Some(inner) => Some(validate_due_at(inner.as_deref())?),
    };

    let repo_patch = TaskPatchRow {
        title,
        description: patch.description,
        priority: patch.priority,
        due_at,
    };
    tasks::update_task(conn, patch.id, &repo_patch, &now())
}

pub fn set_status(conn: &Connection, id: i64, status: &str) -> AppResult<Task> {
    let status = parse_status(status)?;
    tasks::set_task_status(conn, id, status, &now())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    tasks::delete_task(conn, id)
}

#[cfg(test)]
#[path = "tasks_tests.rs"]
mod tasks_tests;
