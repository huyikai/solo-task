use crate::db;
use crate::error::{AppError, AppResult};
use rusqlite::Connection;
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
pub struct ExportSummary {
    pub written_to: String,
    pub bytes: i64,
    pub warnings: Vec<String>,
}

/// Best-effort export: opens read-only (survives partial corruption),
/// serializes all tables to the ExportPayload shape per data-model.md.
pub fn export_json(db_path: &Path, output: &Path) -> AppResult<ExportSummary> {
    let open_result = Connection::open_with_flags(
        db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    );

    let warnings = match &open_result {
        Err(_) => vec!["database_corrupted".to_string()],
        Ok(conn) => match db::integrity_check(conn) {
            Ok(()) => vec![],
            Err(AppError::DbCorrupted) => vec!["database_corrupted".to_string()],
            Err(e) => return Err(e),
        },
    };

    let (tasks, subtasks, tags, reminders) = match open_result {
        Ok(ref conn) => read_all(conn)?,
        Err(_) => (vec![], vec![], vec![], vec![]),
    };

    let payload = serde_json::json!({
        "schema_version": 1,
        "exported_at": chrono_now(),
        "tasks": tasks,
        "subtasks": subtasks,
        "tags": tags,
        "reminders": reminders,
        "warnings": warnings,
    });

    let json = serde_json::to_string_pretty(&payload)
        .map_err(|e| AppError::Unknown(format!("serialize: {e}")))?;

    std::fs::write(output, json).map_err(|e| {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            AppError::PermissionDenied(output.display().to_string())
        } else {
            AppError::IoError(format!("write export: {e}"))
        }
    })?;

    let bytes = std::fs::metadata(output)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    Ok(ExportSummary {
        written_to: output.display().to_string(),
        bytes,
        warnings,
    })
}

fn read_all(
    conn: &Connection,
) -> AppResult<TableRows> {
    // 表可能尚未创建 (部分损坏), 逐个 best-effort
    let tasks = rows_to_json(conn, "SELECT * FROM tasks").unwrap_or_default();
    let subtasks = rows_to_json(conn, "SELECT * FROM subtasks").unwrap_or_default();
    let tags = rows_to_json(conn, "SELECT * FROM tags").unwrap_or_default();
    let reminders = rows_to_json(conn, "SELECT * FROM reminders").unwrap_or_default();

    Ok((tasks, subtasks, tags, reminders))
}

type TableRows = (
    Vec<serde_json::Value>,
    Vec<serde_json::Value>,
    Vec<serde_json::Value>,
    Vec<serde_json::Value>,
);

fn rows_to_json(conn: &Connection, sql: &str) -> AppResult<Vec<serde_json::Value>> {
    let mut stmt = conn.prepare(sql).map_err(|e| db::map_sqlite(e, "prepare"))?;
    let col_count = stmt.column_count();
    let col_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let mut rows = stmt
        .query([])
        .map_err(|e| db::map_sqlite(e, "query"))?;
    let mut out = Vec::new();
    while let Some(row) = rows.next().map_err(|e| db::map_sqlite(e, "row"))? {
        let mut obj = serde_json::Map::new();
        for (i, name) in col_names.iter().enumerate().take(col_count) {
            // 逐列按类型读, 避免 Value: FromSql 不支持的问题
            let v = match row.get_ref(i).map_err(|e| db::map_sqlite(e, "col"))? {
                rusqlite::types::ValueRef::Null => serde_json::Value::Null,
                rusqlite::types::ValueRef::Integer(n) => serde_json::json!(n),
                rusqlite::types::ValueRef::Real(f) => serde_json::json!(f),
                rusqlite::types::ValueRef::Text(t) => {
                    serde_json::json!(String::from_utf8_lossy(t))
                }
                rusqlite::types::ValueRef::Blob(b) => {
                    serde_json::json!(String::from_utf8_lossy(b))
                }
            };
            obj.insert(name.clone(), v);
        }
        out.push(serde_json::Value::Object(obj));
    }
    Ok(out)
}

fn chrono_now() -> String {
    // 无 chrono 依赖, 用 SQLite 时钟等价物: 从 DB 取 or 系统时间
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .map(|secs| format!("{secs}"))
        .unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_json_from_corrupted_db() {
        let tmp = tempfile::tempdir().unwrap();
        let db_file = tmp.path().join("tasks.db");
        let out_file = tmp.path().join("export.json");

        std::fs::write(&db_file, b"junk bytes not sqlite").unwrap();

        let summary = export_json(&db_file, &out_file).unwrap();
        assert_eq!(summary.warnings, vec!["database_corrupted"]);

        let content = std::fs::read_to_string(&out_file).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed["schema_version"], 1);
        assert!(parsed["tasks"].is_array());
        assert!(parsed["subtasks"].is_array());
        assert!(parsed["tags"].is_array());
        assert!(parsed["reminders"].is_array());
        assert_eq!(
            parsed["warnings"],
            serde_json::json!(["database_corrupted"])
        );
    }

    #[test]
    fn test_export_json_from_healthy_db() {
        let tmp = tempfile::tempdir().unwrap();
        let db_file = tmp.path().join("tasks.db");
        let out_file = tmp.path().join("export.json");

        {
            let conn = db::connect_and_init(&db_file).unwrap();
            conn.execute(
                "INSERT INTO tasks (title, created_at, updated_at) VALUES ('hello', 'now', 'now')",
                [],
            )
            .unwrap();
        }

        let summary = export_json(&db_file, &out_file).unwrap();
        assert!(summary.warnings.is_empty());

        let content = std::fs::read_to_string(&out_file).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed["tasks"].as_array().unwrap().len(), 1);
        assert_eq!(parsed["tasks"][0]["title"], "hello");
    }
}
