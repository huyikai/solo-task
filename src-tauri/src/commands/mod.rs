pub mod export_json;
pub mod health_check;
pub mod preferences;
pub mod tasks;
pub mod trigger_test_error;

pub use export_json::ExportSummary;
pub use health_check::HealthStatus;
pub use preferences::PreferenceValue;

use crate::error::AppResult;
use crate::models::Task;
use crate::state::DbState;
use tauri::State;

pub use tasks::{NewTaskInput, TaskPatchInput};

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

#[tauri::command]
pub fn create_task(state: State<DbState>, input: NewTaskInput) -> AppResult<Task> {
    tasks::create(&state.lock(), input)
}

#[tauri::command]
pub fn list_tasks(state: State<DbState>) -> AppResult<Vec<Task>> {
    tasks::list(&state.lock())
}

#[tauri::command]
pub fn update_task(state: State<DbState>, patch: TaskPatchInput) -> AppResult<Task> {
    tasks::update(&state.lock(), patch)
}

#[tauri::command]
pub fn set_task_status(state: State<DbState>, id: i64, status: String) -> AppResult<Task> {
    tasks::set_status(&state.lock(), id, &status)
}

#[tauri::command]
pub fn delete_task(state: State<DbState>, id: i64) -> AppResult<()> {
    tasks::delete(&state.lock(), id)
}
