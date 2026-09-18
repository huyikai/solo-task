import { useCallback, useEffect, useState } from "react";
import { ErrorToast } from "@/components/ui/error-toast";
import TaskRow from "@/components/tasks/TaskRow";
import type { AppErrorSerialized, Task } from "@/api/ipc";
import { listTasks } from "@/api/ipc";
import { t } from "@/i18n/t";

// 列表视图: 挂载时拉取全部任务 (FR-002 顺序由 Rust 端保证),
// 渲染真实数据 / 空状态 / 错误 toast (FR-008)。
// 新建/编辑/删除流程在 Phase 6 (T025/T026) 接入。
export default function ListView() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<AppErrorSerialized | null>(null);

  const refresh = useCallback(async () => {
    const result = await listTasks();
    if (result.ok) {
      setTasks(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col gap-2">
      {tasks !== null && tasks.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16">
          <p className="text-base text-text-muted">{t("tasks.empty")}</p>
          <p className="text-sm text-text-subtle">{t("tasks.empty_hint")}</p>
        </div>
      )}

      {tasks?.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onStatusCycle={() => {
            // Phase 6 (T023/T024) 接 setTaskStatus
          }}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      ))}

      {error && <ErrorToast error={error} />}
    </div>
  );
}
