use crate::db::connect_and_init;
use crate::models::{TaskPriority, TaskStatus};
use crate::repo::tasks::{insert_task, list_tasks, NewTaskRow};
use rusqlite::Connection;
use tempfile::TempDir;

/// Keep the TempDir alive alongside the connection: on macOS/Linux the
/// open handle survives unlink, but keeping it alive is cheaper than
/// reasoning about platform differences.
fn test_conn() -> (Connection, TempDir) {
    let tmp = tempfile::tempdir().unwrap();
    let conn = connect_and_init(&tmp.path().join("tasks.db")).unwrap();
    (conn, tmp)
}

fn row<'a>(title: &'a str, created_at: &'a str) -> NewTaskRow<'a> {
    NewTaskRow {
        title,
        description: "",
        priority: TaskPriority::None,
        due_at: None,
        created_at,
        updated_at: created_at,
    }
}

#[test]
fn test_insert_and_list_orders_by_created_desc() {
    let (conn, _keep) = test_conn();

    let a = insert_task(&conn, &row("earliest", "2026-01-01T00:00:00Z")).unwrap();
    let b = insert_task(&conn, &row("middle", "2026-01-02T00:00:00Z")).unwrap();
    let c = insert_task(&conn, &row("latest", "2026-01-03T00:00:00Z")).unwrap();

    let all = list_tasks(&conn).unwrap();
    assert_eq!(all.len(), 3, "three rows inserted");
    assert_eq!(all[0].id, c.id, "latest created_at must come first");
    assert_eq!(all[1].id, b.id);
    assert_eq!(all[2].id, a.id, "earliest created_at must come last");
}

#[test]
fn test_insert_persists_all_fields_and_defaults() {
    let (conn, _keep) = test_conn();

    let t = insert_task(&conn, &row("买牛奶", "2026-09-18T08:00:00Z")).unwrap();

    assert!(t.id > 0);
    assert_eq!(t.title, "买牛奶");
    assert_eq!(t.description, "");
    assert_eq!(t.status, TaskStatus::Todo, "new tasks default to todo");
    assert_eq!(t.priority, TaskPriority::None);
    assert_eq!(t.due_at, None);
    assert_eq!(t.created_at, "2026-09-18T08:00:00Z");
    assert_eq!(t.updated_at, "2026-09-18T08:00:00Z");
}

#[test]
fn test_insert_round_trips_optional_fields() {
    let (conn, _keep) = test_conn();

    let input = NewTaskRow {
        title: "交报告",
        description: "季度报告,含 burndown 图",
        priority: TaskPriority::High,
        due_at: Some("2026-09-20T18:00:00Z"),
        created_at: "2026-09-18T09:00:00Z",
        updated_at: "2026-09-18T09:00:00Z",
    };
    let t = insert_task(&conn, &input).unwrap();

    assert_eq!(t.description, "季度报告,含 burndown 图");
    assert_eq!(t.priority, TaskPriority::High);
    assert_eq!(t.due_at, Some("2026-09-20T18:00:00Z".to_string()));

    // 同一秒创建的两条按 id DESC 稳定排序 (plan.md D5)
    let later_id = insert_task(&conn, &input).unwrap();
    let all = list_tasks(&conn).unwrap();
    assert_eq!(all[0].id, later_id.id, "same-second tie must break by id DESC");
    assert_eq!(all[1].id, t.id);
}
