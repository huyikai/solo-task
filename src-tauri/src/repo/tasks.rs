use crate::db::map_sqlite;
use crate::error::{AppError, AppResult};
use crate::models::{Task, TaskPriority, TaskStatus};
use rusqlite::{params, Connection, Row};

/// Validated, time-stamped input for [`insert_task`]. The command layer
/// owns validation and clock; this layer is pure SQL (plan.md §2).
pub struct NewTaskRow<'a> {
    pub title: &'a str,
    pub description: &'a str,
    pub priority: TaskPriority,
    pub due_at: Option<&'a str>,
    pub created_at: &'a str,
    pub updated_at: &'a str,
}

fn row_to_task(row: &Row<'_>) -> rusqlite::Result<Task> {
    let status_str: String = row.get("status")?;
    let priority_str: String = row.get("priority")?;
    // DB 值由本模块写入, parse 失败说明 schema 被外部篡改 — 按损坏映射
    // 比静默默认更符合 Principle VII (不静默修复)。
    let status = TaskStatus::parse(&status_str).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            0,
            rusqlite::types::Type::Text,
            format!("invalid status in db: {status_str}").into(),
        )
    })?;
    let priority = TaskPriority::parse(&priority_str).ok_or_else(|| {
        rusqlite::Error::FromSqlConversionFailure(
            0,
            rusqlite::types::Type::Text,
            format!("invalid priority in db: {priority_str}").into(),
        )
    })?;

    Ok(Task {
        id: row.get("id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        status,
        priority,
        due_at: row.get("due_at")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

const TASK_COLUMNS: &str =
    "id, title, description, status, priority, due_at, created_at, updated_at";

fn query_one(conn: &Connection, id: i64) -> AppResult<Task> {
    let sql = format!("SELECT {TASK_COLUMNS} FROM tasks WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_task)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::TaskNotFound(id),
            other => map_sqlite(other, "query task"),
        })
}

pub fn insert_task(conn: &Connection, input: &NewTaskRow<'_>) -> AppResult<Task> {
    conn.execute(
        "INSERT INTO tasks (title, description, status, priority, due_at, created_at, updated_at)
         VALUES (?1, ?2, 'todo', ?3, ?4, ?5, ?6)",
        params![
            input.title,
            input.description,
            input.priority.as_str(),
            input.due_at,
            input.created_at,
            input.updated_at,
        ],
    )
    .map_err(|e| map_sqlite(e, "insert task"))?;

    let id = conn.last_insert_rowid();
    query_one(conn, id)
}

pub fn list_tasks(conn: &Connection) -> AppResult<Vec<Task>> {
    let sql = format!(
        "SELECT {TASK_COLUMNS} FROM tasks ORDER BY created_at DESC, id DESC"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| map_sqlite(e, "list tasks"))?;
    let rows = stmt
        .query_map([], row_to_task)
        .map_err(|e| map_sqlite(e, "list tasks"))?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(|e| map_sqlite(e, "list tasks"))?);
    }
    Ok(out)
}

pub fn get_task(conn: &Connection, id: i64) -> AppResult<Task> {
    query_one(conn, id)
}

/// Partial update payload: `None` = leave the column untouched,
/// `Some(None)` = explicitly clear (only meaningful for due_at).
pub struct TaskPatchRow {
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<TaskPriority>,
    pub due_at: Option<Option<String>>,
}

pub fn update_task(
    conn: &Connection,
    id: i64,
    patch: &TaskPatchRow,
    updated_at: &str,
) -> AppResult<Task> {
    // 动态 SET: 只更新显式传入的列 (FR-003 部分更新语义)。
    let mut columns: Vec<&'static str> = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(title) = &patch.title {
        columns.push("title");
        params.push(Box::new(title.clone()));
    }
    if let Some(description) = &patch.description {
        columns.push("description");
        params.push(Box::new(description.clone()));
    }
    if let Some(priority) = patch.priority {
        columns.push("priority");
        params.push(Box::new(priority.as_str().to_string()));
    }
    if let Some(due_at) = &patch.due_at {
        columns.push("due_at");
        params.push(Box::new(due_at.clone()));
    }

    if columns.is_empty() {
        // 无字段可更新: 只刷 updated_at 语义不成立, 直接原样返回,
        // 不产生写放大。
        return query_one(conn, id);
    }

    columns.push("updated_at");
    params.push(Box::new(updated_at.to_string()));

    let sets_sql: Vec<String> = columns
        .iter()
        .enumerate()
        .map(|(i, col)| format!("{col} = ?{}", i + 1))
        .collect();
    let sql = format!("UPDATE tasks SET {} WHERE id = ?", sets_sql.join(", "));
    params.push(Box::new(id));

    let affected = conn
        .execute(&sql, params.iter().map(|p| p.as_ref()).collect::<Vec<_>>().as_slice())
        .map_err(|e| map_sqlite(e, "update task"))?;
    if affected == 0 {
        return Err(AppError::TaskNotFound(id));
    }
    query_one(conn, id)
}

pub fn set_task_status(
    conn: &Connection,
    id: i64,
    status: TaskStatus,
    updated_at: &str,
) -> AppResult<Task> {
    let affected = conn
        .execute(
            "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status.as_str(), updated_at, id],
        )
        .map_err(|e| map_sqlite(e, "set task status"))?;
    if affected == 0 {
        return Err(AppError::TaskNotFound(id));
    }
    query_one(conn, id)
}

pub fn delete_task(conn: &Connection, id: i64) -> AppResult<()> {
    let affected = conn
        .execute("DELETE FROM tasks WHERE id = ?1", params![id])
        .map_err(|e| map_sqlite(e, "delete task"))?;
    if affected == 0 {
        return Err(AppError::TaskNotFound(id));
    }
    Ok(())
}
