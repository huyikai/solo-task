use crate::error::AppError;

pub type TestVariant = &'static str;

/// Developer-mode helper: returns the requested error variant so the
/// frontend can drive each path through the real IPC layer.
#[allow(clippy::match_like_matches_macro)]
pub fn trigger(variant: &str) -> AppError {
    match variant {
        "db_locked" => AppError::DbLocked,
        "db_corrupted" => AppError::DbCorrupted,
        "permission_denied" => AppError::PermissionDenied("test".into()),
        _ => AppError::Unknown("test".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trigger_returns_named_variant() {
        assert!(matches!(trigger("db_locked"), AppError::DbLocked));
        assert!(matches!(trigger("db_corrupted"), AppError::DbCorrupted));
        assert!(matches!(
            trigger("permission_denied"),
            AppError::PermissionDenied(_)
        ));
        assert!(matches!(trigger("unknown"), AppError::Unknown(_)));
    }
}
