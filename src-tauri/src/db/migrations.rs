use crate::error::{AppError, AppResult};
use rusqlite::Connection;

/// Run pending migrations. Each migration runs inside a transaction;
/// applied versions are recorded in `migrations`.
pub fn run(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS migrations (
            version     INTEGER PRIMARY KEY NOT NULL,
            applied_at  TEXT    NOT NULL,
            description TEXT    NOT NULL
        );",
    )
    .map_err(|e| super::map_sqlite(e, "create migrations table"))?;

    let current: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM migrations",
            [],
            |row| row.get(0),
        )
        .map_err(|e| super::map_sqlite(e, "read migration version"))?;

    if current < 1 {
        apply_v1(conn)?;
    }

    Ok(())
}

fn apply_v1(conn: &Connection) -> AppResult<()> {
    conn.execute_batch("BEGIN;")
        .map_err(|e| super::map_sqlite(e, "begin v1"))?;

    let result = (|| -> AppResult<()> {
        conn.execute_batch(
            "CREATE TABLE tasks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                title       TEXT    NOT NULL,
                description TEXT    NOT NULL DEFAULT '',
                status      TEXT    NOT NULL DEFAULT 'todo',
                priority    TEXT    NOT NULL DEFAULT 'none',
                due_at      TEXT,
                created_at  TEXT    NOT NULL,
                updated_at  TEXT    NOT NULL
            );
            CREATE TABLE subtasks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                parent_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                title       TEXT    NOT NULL,
                done        INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT    NOT NULL,
                updated_at  TEXT    NOT NULL
            );
            CREATE TABLE tags (
                id    INTEGER PRIMARY KEY AUTOINCREMENT,
                name  TEXT    NOT NULL UNIQUE
            );
            CREATE TABLE task_tags (
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
                PRIMARY KEY (task_id, tag_id)
            );
            CREATE TABLE reminders (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                fire_at     TEXT    NOT NULL,
                recurrence  TEXT,
                fired       INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT    NOT NULL
            );
            CREATE TABLE user_preferences (
                key        TEXT    PRIMARY KEY NOT NULL,
                value      TEXT    NOT NULL,
                updated_at TEXT    NOT NULL
            );
            INSERT INTO user_preferences (key, value, updated_at) VALUES
                ('theme.mode', '\"system\"', datetime('now'));
            INSERT INTO migrations (version, applied_at, description) VALUES
                (1, datetime('now'), 'initial foundation schema');
            ",
        )
        .map_err(|e| super::map_sqlite(e, "apply v1 schema"))?;
        Ok(())
    })();

    match result {
        Ok(()) => conn
            .execute_batch("COMMIT;")
            .map_err(|e| super::map_sqlite(e, "commit v1")),
        Err(e) => {
            let _ = conn.execute_batch("ROLLBACK;");
            Err(e)
        }
    }
}

/// Marker to satisfy unused-import lint when AppError unused in some cfgs.
#[allow(dead_code)]
fn _assert_error_in_use(_: AppError) {}
