//! 守卫测试: lib.rs 不能注册 `.on_window_event(...)` 处理 CloseRequested。
//! 关闭按钮的"隐藏/退出"决策在 JS 端 (plan.md D1),Rust 端拦截会与
//! `getPreference("window.close_action")` 的 Settings UI 形成两套真理。
//! 若未来需要 Rust 端拦截,需先经过 spec amendment 移除此守卫。

#[test]
fn lib_rs_does_not_register_on_window_event() {
    let src = include_str!("lib.rs");
    assert!(
        !src.contains("on_window_event"),
        "lib.rs 不应注册 on_window_event (plan D1: 关闭拦截在 JS 端); \
         若未来需要 Rust 端拦截,先走 spec amendment 移除此守卫"
    );
}

#[test]
fn lib_rs_setup_calls_tray_install() {
    let src = include_str!("lib.rs");
    assert!(
        src.contains("tray::install"),
        "lib.rs::run().setup() 必须调用 tray::install(app) (FR-001)"
    );
}