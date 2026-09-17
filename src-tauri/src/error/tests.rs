use super::AppError;

#[test]
fn test_app_error_serializes_to_snake_case() {
    let e = AppError::DbLocked;
    let json = serde_json::to_string(&e).unwrap();
    assert!(json.contains("db_locked"), "got: {json}");

    let e = AppError::DbCorrupted;
    let json = serde_json::to_string(&e).unwrap();
    assert!(json.contains("db_corrupted"), "got: {json}");

    let e = AppError::TaskNotFound(7);
    let json = serde_json::to_string(&e).unwrap();
    assert!(json.contains("task_not_found"), "got: {json}");
    assert!(json.contains("7"), "got: {json}");

    let e = AppError::PermissionDenied("readonly".into());
    let json = serde_json::to_string(&e).unwrap();
    assert!(json.contains("permission_denied"), "got: {json}");

    let e = AppError::IoError("disk".into());
    let json = serde_json::to_string(&e).unwrap();
    assert!(json.contains("io_error"), "got: {json}");

    let e = AppError::Unknown("boom".into());
    let json = serde_json::to_string(&e).unwrap();
    assert!(json.contains("unknown"), "got: {json}");
}
