use serde::{Deserialize, Serialize};

/// Task status. Stored as TEXT in SQLite ('todo' | 'doing' | 'done'),
/// serialized over IPC as the same lowercase string (contracts/ipc.md).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskStatus {
    Todo,
    Doing,
    Done,
}

impl TaskStatus {
    pub const ALL: [TaskStatus; 3] = [TaskStatus::Todo, TaskStatus::Doing, TaskStatus::Done];

    pub fn as_str(&self) -> &'static str {
        match self {
            TaskStatus::Todo => "todo",
            TaskStatus::Doing => "doing",
            TaskStatus::Done => "done",
        }
    }

    /// Parse the DB representation. Returns None for unknown strings —
    /// callers map that to AppError::Validation.
    pub fn parse(s: &str) -> Option<TaskStatus> {
        TaskStatus::ALL.iter().copied().find(|v| v.as_str() == s)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskPriority {
    None,
    Low,
    Med,
    High,
}

impl TaskPriority {
    pub const ALL: [TaskPriority; 4] = [
        TaskPriority::None,
        TaskPriority::Low,
        TaskPriority::Med,
        TaskPriority::High,
    ];

    pub fn as_str(&self) -> &'static str {
        match self {
            TaskPriority::None => "none",
            TaskPriority::Low => "low",
            TaskPriority::Med => "med",
            TaskPriority::High => "high",
        }
    }

    pub fn parse(s: &str) -> Option<TaskPriority> {
        TaskPriority::ALL.iter().copied().find(|v| v.as_str() == s)
    }
}

/// Task DTO crossing the IPC boundary (contracts/ipc.md). Field names
/// are already snake_case, matching the SQLite columns 1:1.
#[derive(Debug, Clone, Serialize)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub status: TaskStatus,
    pub priority: TaskPriority,
    pub due_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
