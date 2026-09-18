use serde::Serialize;

/// Cross-IPC error contract. Serialized as
/// `{ "variant": "<snake_case>", "message": "..." }` per data-model.md.
#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "variant", content = "message", rename_all = "snake_case")]
pub enum AppError {
    #[error("database is locked by another process")]
    DbLocked,
    #[error("database file is corrupted")]
    DbCorrupted,
    #[error("task not found: {0}")]
    TaskNotFound(i64),
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("permission denied: {0}")]
    PermissionDenied(String),
    #[error("io error: {0}")]
    IoError(String),
    #[error("unknown error: {0}")]
    Unknown(String),
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests;
