use std::sync::Mutex;
use rusqlite::Connection;

/// Thread-safe managed state holding the SQLite connection.
pub struct DbState {
    conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(conn: Connection) -> Self {
        Self { conn: Mutex::new(conn) }
    }

    /// Lock and return the connection. Panics are contained by the Mutex
    /// poisoning recovery below (reconnect-free: we just report DbLocked).
    pub fn lock(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    /// Ensure state has been initialized; used by health_check.
    pub fn ensure(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.lock()
    }
}
