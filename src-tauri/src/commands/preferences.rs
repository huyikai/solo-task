use crate::error::{AppError, AppResult};
use crate::state::DbState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct PreferenceValue {
    pub key: String,
    pub value: String,
    pub updated_at: String,
}

pub fn get_preference(state: State<DbState>, key: String) -> AppResult<PreferenceValue> {
    let conn = state.lock();
    conn.query_row(
        "SELECT key, value, updated_at FROM user_preferences WHERE key = ?1",
        [&key],
        |row| {
            Ok(PreferenceValue {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::Unknown(format!("preference_not_found: {key}"))
        }
        other => crate::db::map_sqlite(other, "get_preference"),
    })
}

pub fn set_preference(state: State<DbState>, key: String, value: String) -> AppResult<()> {
    let conn = state.lock();
    conn.execute(
        "INSERT INTO user_preferences (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')",
        [&key, &value],
    )
    .map_err(|e| crate::db::map_sqlite(e, "set_preference"))?;
    Ok(())
}
