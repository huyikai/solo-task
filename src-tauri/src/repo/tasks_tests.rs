use crate::db::connect_and_init;
use crate::error::AppError;
use crate::models::{TaskPriority, TaskStatus};
use crate::repo::tasks::{
    delete_task, insert_task, list_tasks, set_task_status, update_task, NewTaskRow, TaskPatchRow,
};
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

#[test]
fn test_update_partial_fields_leaves_others_untouched() {
    let (conn, _keep) = test_conn();
    let t = insert_task(
        &conn,
        &NewTaskRow {
            title: "原标题",
            description: "原描述",
            priority: TaskPriority::Low,
            due_at: Some("2026-09-20T18:00:00Z"),
            created_at: "2026-09-18T08:00:00Z",
            updated_at: "2026-09-18T08:00:00Z",
        },
    )
    .unwrap();

    let patch = TaskPatchRow {
        title: Some("新标题".into()),
        description: None,
        priority: None,
        due_at: None,
    };
    let updated = update_task(&conn, t.id, &patch, "2026-09-19T10:00:00Z").unwrap();

    assert_eq!(updated.title, "新标题", "explicit field updates");
    assert_eq!(updated.description, "原描述", "unspecified field untouched");
    assert_eq!(updated.priority, TaskPriority::Low);
    assert_eq!(updated.due_at, Some("2026-09-20T18:00:00Z".to_string()));
    assert_eq!(updated.created_at, "2026-09-18T08:00:00Z", "created_at immutable");
    assert_eq!(updated.updated_at, "2026-09-19T10:00:00Z", "updated_at refreshed");
}

#[test]
fn test_update_can_clear_due_at_with_explicit_null() {
    let (conn, _keep) = test_conn();
    let t = insert_task(
        &conn,
        &NewTaskRow {
            title: "有到期日",
            description: "",
            priority: TaskPriority::None,
            due_at: Some("2026-09-20T18:00:00Z"),
            created_at: "2026-09-18T08:00:00Z",
            updated_at: "2026-09-18T08:00:00Z",
        },
    )
    .unwrap();

    // due_at: Some(None) = 显式清空; None = 不动 (contracts/ipc.md)
    let patch = TaskPatchRow {
        title: None,
        description: None,
        priority: None,
        due_at: Some(None),
    };
    let updated = update_task(&conn, t.id, &patch, "2026-09-19T10:00:00Z").unwrap();
    assert_eq!(updated.due_at, None, "Some(None) must clear due_at");
}

#[test]
fn test_update_missing_id_returns_task_not_found() {
    let (conn, _keep) = test_conn();
    let patch = TaskPatchRow {
        title: Some("幽灵".into()),
        description: None,
        priority: None,
        due_at: None,
    };
    let result = update_task(&conn, 999, &patch, "2026-09-19T10:00:00Z");
    assert!(matches!(result, Err(AppError::TaskNotFound(999))), "got {result:?}");
}

#[test]
fn test_set_status_updates_status_and_timestamp() {
    let (conn, _keep) = test_conn();
    let t = insert_task(&conn, &row("流转", "2026-09-18T08:00:00Z")).unwrap();
    assert_eq!(t.status, TaskStatus::Todo);

    let doing = set_task_status(&conn, t.id, TaskStatus::Doing, "2026-09-18T09:00:00Z").unwrap();
    assert_eq!(doing.status, TaskStatus::Doing);
    assert_eq!(doing.updated_at, "2026-09-18T09:00:00Z");

    let done = set_task_status(&conn, t.id, TaskStatus::Done, "2026-09-18T10:00:00Z").unwrap();
    assert_eq!(done.status, TaskStatus::Done);

    let back = set_task_status(&conn, t.id, TaskStatus::Todo, "2026-09-18T11:00:00Z").unwrap();
    assert_eq!(back.status, TaskStatus::Todo, "any-direction transitions allowed (spec US3)");
}

#[test]
fn test_set_status_missing_id_returns_task_not_found() {
    let (conn, _keep) = test_conn();
    let result = set_task_status(&conn, 12345, TaskStatus::Done, "2026-09-18T09:00:00Z");
    assert!(matches!(result, Err(AppError::TaskNotFound(12345))), "got {result:?}");
}

#[test]
fn test_delete_removes_row() {
    let (conn, _keep) = test_conn();
    let t = insert_task(&conn, &row("待删除", "2026-09-18T08:00:00Z")).unwrap();

    delete_task(&conn, t.id).unwrap();
    let all = list_tasks(&conn).unwrap();
    assert!(all.is_empty(), "row must be gone");

    let result = crate::repo::tasks::get_task(&conn, t.id);
    assert!(matches!(result, Err(AppError::TaskNotFound(_))));
}

#[test]
fn test_delete_missing_id_returns_task_not_found() {
    let (conn, _keep) = test_conn();
    let result = delete_task(&conn, 777);
    assert!(matches!(result, Err(AppError::TaskNotFound(777))), "got {result:?}");
}

#[test]
fn test_list_1000_rows_under_50ms() {
    let (conn, _keep) = test_conn();

    // 单事务批量插入 1,000 行 (SC-001: list_tasks < 50ms @ 1,000 rows)。
    conn.execute_batch("BEGIN").unwrap();
    for i in 0..1000 {
        insert_task(
            &conn,
            &NewTaskRow {
                title: Box::leak(format!("任务 {i}").into_boxed_str()),
                description: "",
                priority: TaskPriority::None,
                due_at: None,
                created_at: Box::leak(format!("2026-09-18T{:02}:{:02}:{:02}Z", i / 3600, (i / 60) % 60, i % 60).into_boxed_str()),
                updated_at: "2026-09-18T00:00:00Z",
            },
        )
        .unwrap();
    }
    conn.execute_batch("COMMIT").unwrap();

    // 预热一次 (页缓存), 然后测量稳态耗时。
    let _ = list_tasks(&conn).unwrap();
    let start = std::time::Instant::now();
    let all = list_tasks(&conn).unwrap();
    let elapsed = start.elapsed();

    assert_eq!(all.len(), 1000);
    assert!(
        elapsed.as_millis() < 50,
        "list_tasks over 1,000 rows took {}ms, budget is 50ms",
        elapsed.as_millis()
    );
}
