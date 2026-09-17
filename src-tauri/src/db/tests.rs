use super::connect_and_init;
#[allow(unused_imports)]
use super::integrity_check;

#[test]
fn test_migration_creates_empty_tables() {
    let tmp = tempfile::tempdir().unwrap();
    let db_file = tmp.path().join("tasks.db");

    let conn = connect_and_init(&db_file).expect("init should succeed");

    // 6 张表 per data-model.md: tasks, subtasks, tags, task_tags,
    // reminders, migrations, user_preferences
    let expected = [
        "tasks",
        "subtasks",
        "tags",
        "task_tags",
        "reminders",
        "migrations",
        "user_preferences",
    ];
    for table in expected {
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name=?1",
                [table],
                |row| row.get(0),
            )
            .unwrap();
        assert!(exists, "table {table} should exist");
    }

    // migrations 元表应记录 v1
    let version: i64 = conn
        .query_row("SELECT MAX(version) FROM migrations", [], |row| row.get(0))
        .unwrap();
    assert_eq!(version, 1, "migration v1 should be recorded");

    // user_preferences 应 seed theme.mode = "system"
    let theme: String = conn
        .query_row(
            "SELECT value FROM user_preferences WHERE key='theme.mode'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(theme, "\"system\"");
}

#[test]
fn test_migration_is_idempotent() {
    let tmp = tempfile::tempdir().unwrap();
    let db_file = tmp.path().join("tasks.db");

    let _first = connect_and_init(&db_file).unwrap();
    // 第二次打开不应报错或重复插入
    let second = connect_and_init(&db_file).unwrap();
    let count: i64 = second
        .query_row("SELECT COUNT(*) FROM migrations WHERE version=1", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!(count, 1, "v1 should only be applied once");
}

#[test]
fn test_integrity_check_detects_corruption() {
    let tmp = tempfile::tempdir().unwrap();
    let db_file = tmp.path().join("tasks.db");

    // 写入非 SQLite 字节模拟损坏
    std::fs::write(&db_file, b"this is not a sqlite file").unwrap();

    // connect 时不会立刻失败 (SQLite 惰性打开), integrity_check 应报损坏
    let result = connect_and_init(&db_file);
    match result {
        Ok(conn) => {
            let check = integrity_check(&conn);
            assert!(
                matches!(check, Err(crate::error::AppError::DbCorrupted)),
                "corrupted file should yield DbCorrupted, got {check:?}"
            );
        }
        Err(crate::error::AppError::DbCorrupted) => {
            // 打开阶段直接报损坏也接受
        }
        Err(other) => panic!("unexpected error: {other:?}"),
    }
}
