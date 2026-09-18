pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod paths;
pub mod repo;
pub mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_state = commands::health_check::init_state()
        .expect("failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            commands::health_check,
            commands::create_task,
            commands::list_tasks,
            commands::update_task,
            commands::set_task_status,
            commands::delete_task,
            commands::export_json,
            commands::get_preference,
            commands::set_preference,
            commands::trigger_test_error_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
