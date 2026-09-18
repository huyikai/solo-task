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

#[test]
fn test_validation_error_serializes_with_field_message() {
    let e = AppError::Validation("title: must be 1..=200 chars".into());
    let json = serde_json::to_string(&e).unwrap();
    assert!(
        json.contains("\"variant\":\"validation\""),
        "variant tag must be `validation`, got: {json}"
    );
    assert!(
        json.contains("title: must be 1..=200 chars"),
        "message must be preserved verbatim, got: {json}"
    );

    // Round-trip: the frontend discriminator must be able to distinguish
    // validation from unknown (FR-007).
    let e = AppError::Unknown("boom".into());
    let json = serde_json::to_string(&e).unwrap();
    assert!(!json.contains("validation"), "got: {json}");
}
