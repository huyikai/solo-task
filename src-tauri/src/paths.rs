use std::path::PathBuf;

/// Resolve the SQLite DB path per data-model.md:
/// macOS: ~/Library/Application Support/com.huyikai.solo-task/tasks.db
/// Windows: %APPDATA%/com.huyikai.solo-task/tasks.db
pub fn db_path() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("com.huyikai.solo-task").join("tasks.db")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_db_path_uses_dirs_crate() {
        let path = db_path();
        let s = path.to_string_lossy();

        assert!(
            s.contains("com.huyikai.solo-task"),
            "path should contain app identifier, got: {s}"
        );
        assert!(
            s.ends_with("tasks.db"),
            "path should end with tasks.db, got: {s}"
        );
    }
}
