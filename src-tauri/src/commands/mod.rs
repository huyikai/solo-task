pub mod export_json;
pub mod health_check;
pub mod preferences;
pub mod trigger_test_error;

pub use export_json::ExportSummary;
pub use health_check::HealthStatus;
pub use preferences::PreferenceValue;

use crate::error::AppResult;
use crate::state::DbState;
use tauri::State;

#[tauri::command]
pub fn health_check(state: State<DbState>) -> AppResult<HealthStatus> {
    health_check::health_check(state)
}

#[tauri::command]
pub fn export_json(path: String, output: String) -> AppResult<ExportSummary> {
    export_json::export_json(
        std::path::Path::new(&path),
        std::path::Path::new(&output),
    )
}

#[tauri::command]
pub fn get_preference(state: State<DbState>, key: String) -> AppResult<PreferenceValue> {
    preferences::get_preference(state, key)
}

#[tauri::command]
pub fn set_preference(state: State<DbState>, key: String, value: String) -> AppResult<()> {
    preferences::set_preference(state, key, value)
}

#[tauri::command]
pub fn trigger_test_error_command(variant: String) -> AppResult<()> {
    Err(trigger_test_error::trigger(&variant))
}
