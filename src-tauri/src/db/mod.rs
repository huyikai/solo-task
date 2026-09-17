pub mod migrations;
pub mod tests;

use crate::error::{AppError, AppResult};
use rusqlite::Connection;
use std::path::Path;

/// Open (creating if needed) the SQLite DB at `path`, set WAL mode,
/// and run pending migrations inside a transaction
/// (Constitution Principle VII.4: panic-safe writes).
pub fn connect_and_init(path: &Path) -> AppResult<Connection> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::IoError(format!("create db dir: {e}")))?;
    }

    let conn = Connection::open(path)
        .map_err(|e| map_sqlite(e, "open db"))?;

    conn.pragma_update(None, "journal_mode", "WAL")
        .map_err(|e| map_sqlite(e, "set WAL"))?;

    migrations::run(&conn)?;
    Ok(conn)
}

/// Run `PRAGMA integrity_check`; map any non-`ok` result to
/// `AppError::DbCorrupted` (Constitution Principle VII.1).
pub fn integrity_check(conn: &Connection) -> AppResult<()> {
    let result: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|e| map_sqlite(e, "integrity_check"))?;

    if result == "ok" {
        Ok(())
    } else {
        Err(AppError::DbCorrupted)
    }
}

pub(crate) fn map_sqlite(e: rusqlite::Error, context: &str) -> AppError {
    match &e {
        rusqlite::Error::SqliteFailure(ffi, _)
            if ffi.code == rusqlite::ffi::ErrorCode::DatabaseLocked =>
        {
            AppError::DbLocked
        }
        rusqlite::Error::SqliteFailure(ffi, _)
            if ffi.code == rusqlite::ffi::ErrorCode::DatabaseBusy =>
        {
            AppError::DbLocked
        }
        // 损坏的 DB 文件: "file is not a database" / "database disk image is malformed"
        rusqlite::Error::SqliteFailure(ffi, msg)
            if ffi.code == rusqlite::ffi::ErrorCode::NotADatabase
                || msg
                    .as_deref()
                    .is_some_and(|m| m.contains("malformed") || m.contains("not a database")) =>
        {
            AppError::DbCorrupted
        }
        _ => AppError::Unknown(format!("{context}: {e}")),
    }
}
