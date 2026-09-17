use crate::db;
use crate::error::{AppError, AppResult};
use crate::paths::db_path;
use crate::state::DbState;
use rusqlite::Connection;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct HealthStatus {
    pub ok: bool,
}

fn open_or_detect() -> AppResult<Connection> {
    let path = db_path();
    // 文件级探测: 存在但非 SQLite header -> 直接报损坏
    // (SQLite 惰性打开会让 connect 成功但后续 WAL/migration 失败)
    if path.exists() {
        let mut header = [0u8; 16];
        match std::fs::File::open(&path) {
            Ok(mut f) => {
                use std::io::Read;
                let read = f.read(&mut header).unwrap_or(0);
                let is_sqlite = read >= 16 && &header[..15] == b"SQLite format 3";
                if !is_sqlite {
                    return Err(AppError::DbCorrupted);
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::PermissionDenied => {
                return Err(AppError::PermissionDenied(path.display().to_string()));
            }
            Err(e) => return Err(AppError::IoError(format!("probe db: {e}"))),
        }
    }

    db::connect_and_init(&path)
}

pub fn health_check(state: State<DbState>) -> AppResult<HealthStatus> {
    let conn = state.lock();
    db::integrity_check(&conn)?;
    Ok(HealthStatus { ok: true })
}

/// Initialize the managed DbState on app setup.
pub fn init_state() -> Result<DbState, AppError> {
    let conn = open_or_detect()?;
    Ok(DbState::new(conn))
}
