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

#[cfg(test)]
mod window_capability_tests {
    // 2026-09 用户报告: 自绘红绿灯点击无反应。根因之一是 capabilities
    // 只授了 allow-start-dragging — core:window:default 仅含只读权限,
    // minimize/close/toggle_maximize 被 ACL 拒绝且 JS 端 void 吞掉。
    // 此测试机器守护窗口动作权限不再被裁掉。
    #[test]
    fn window_control_actions_are_granted() {
        let caps = include_str!("../capabilities/default.json");
        for perm in [
            "core:window:allow-minimize",
            "core:window:allow-close",
            "core:window:allow-toggle-maximize",
        ] {
            assert!(
                caps.contains(perm),
                "capabilities/default.json 缺少 {perm} — 红绿灯按钮会是死的"
            );
        }
    }
}
