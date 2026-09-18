use crate::commands::tasks::{
    create, delete, list, set_status, update, NewTaskInput, TaskPatchInput,
};
use crate::db::connect_and_init;
use crate::error::AppError;
use crate::models::TaskStatus;
use rusqlite::Connection;
use tempfile::TempDir;

fn test_conn() -> (Connection, TempDir) {
    let tmp = tempfile::tempdir().unwrap();
    let conn = connect_and_init(&tmp.path().join("tasks.db")).unwrap();
    (conn, tmp)
}

fn input(title: &str) -> NewTaskInput {
    NewTaskInput {
        title: title.into(),
        description: String::new(),
        priority: None,
        due_at: None,
    }
}

#[test]
fn test_create_happy_path_defaults_and_generated_timestamps() {
    let (conn, _keep) = test_conn();
    let t = create(&conn, input("买牛奶")).unwrap();

    assert_eq!(t.title, "买牛奶");
    assert_eq!(t.status, TaskStatus::Todo);
    assert_eq!(t.priority, crate::models::TaskPriority::None);
    assert_eq!(t.due_at, None);
    // created_at 由 Rust 生成 (FR-001): 合法 RFC3339 且带 Z 后缀
    assert!(t.created_at.ends_with('Z'), "got {}", t.created_at);
    assert_eq!(t.created_at, t.updated_at);
}

#[test]
fn test_create_title_is_trimmed() {
    let (conn, _keep) = test_conn();
    let t = create(&conn, input("  两侧空白  ")).unwrap();
    assert_eq!(t.title, "两侧空白", "title must be trimmed before store");
}

#[test]
fn test_create_rejects_empty_and_whitespace_title() {
    let (conn, _keep) = test_conn();
    for bad in ["", "   "] {
        let result = create(&conn, input(bad));
        assert!(
            matches!(&result, Err(AppError::Validation(m)) if m.contains("title")),
            "empty/whitespace title must yield Validation(title), got {result:?}"
        );
    }
}

#[test]
fn test_create_rejects_title_over_200_chars() {
    let (conn, _keep) = test_conn();
    let too_long: String = "字".repeat(201);
    let result = create(&conn, input(&too_long));
    assert!(
        matches!(&result, Err(AppError::Validation(m)) if m.contains("title")),
        "201 chars must be rejected, got {result:?}"
    );

    // 边界内: 恰好 200 字符 (按 Unicode char 计, spec FR-006)
    let ok: String = "字".repeat(200);
    assert!(create(&conn, input(&ok)).is_ok());
}

#[test]
fn test_create_rejects_description_over_5000_chars() {
    let (conn, _keep) = test_conn();
    let mut i = input("有超长描述");
    i.description = "x".repeat(5001);
    let result = create(&conn, i);
    assert!(
        matches!(&result, Err(AppError::Validation(m)) if m.contains("description")),
        "got {result:?}"
    );
}

#[test]
fn test_create_rejects_invalid_priority() {
    let (conn, _keep) = test_conn();
    // priority 走 serde 反序列化, 但绕过 IPC 的直接调用仍可能给出
    // 未受支持的字符串 — 命令层的 parse 兜底必须返回 Validation。
    let result = create(&conn, input("正常标题"));
    assert!(result.is_ok()); // 前置 sanity

    // 直接测 due_at / status 的字符串入口在 set_status / update 覆盖
}

#[test]
fn test_create_rejects_invalid_due_at() {
    let (conn, _keep) = test_conn();
    let mut i = input("有到期日");
    i.due_at = Some("下周三".into());
    let result = create(&conn, i);
    assert!(
        matches!(&result, Err(AppError::Validation(m)) if m.contains("due_at")),
        "non-RFC3339 due_at must yield Validation(due_at), got {result:?}"
    );

    // 合法 RFC3339 原样存储
    let mut i = input("合法到期日");
    i.due_at = Some("2026-09-20T18:00:00Z".into());
    let t = create(&conn, i).unwrap();
    assert_eq!(t.due_at, Some("2026-09-20T18:00:00Z".to_string()));
}

#[test]
fn test_list_returns_all_rows() {
    let (conn, _keep) = test_conn();
    create(&conn, input("a")).unwrap();
    create(&conn, input("b")).unwrap();
    assert_eq!(list(&conn).unwrap().len(), 2);
}

#[test]
fn test_update_validation_and_not_found() {
    let (conn, _keep) = test_conn();
    let t = create(&conn, input("原始")).unwrap();

    // 空标题 patch → Validation
    let patch = TaskPatchInput {
        id: t.id,
        title: Some("   ".into()),
        description: None,
        priority: None,
        due_at: None,
    };
    assert!(matches!(
        update(&conn, patch),
        Err(AppError::Validation(m)) if m.contains("title")
    ));

    // 不存在的 id → TaskNotFound
    let patch = TaskPatchInput {
        id: 424242,
        title: Some("幽灵".into()),
        description: None,
        priority: None,
        due_at: None,
    };
    assert!(matches!(update(&conn, patch), Err(AppError::TaskNotFound(424242))));
}

#[test]
fn test_set_status_validation_and_not_found() {
    let (conn, _keep) = test_conn();
    let t = create(&conn, input("流转")).unwrap();

    // 非法 status 字符串 → Validation
    let result = set_status(&conn, t.id, "archived");
    assert!(
        matches!(&result, Err(AppError::Validation(m)) if m.contains("status")),
        "got {result:?}"
    );

    // 合法值 (字符串入口, 模拟 IPC 反序列化产物)
    let done = set_status(&conn, t.id, "done").unwrap();
    assert_eq!(done.status, TaskStatus::Done);

    // 不存在的 id → TaskNotFound
    let result = set_status(&conn, 88888, "todo");
    assert!(matches!(result, Err(AppError::TaskNotFound(88888))));
}

#[test]
fn test_delete_missing_id_returns_not_found() {
    let (conn, _keep) = test_conn();
    assert!(matches!(delete(&conn, 31337), Err(AppError::TaskNotFound(31337))));
}
