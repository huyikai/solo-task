import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorToast } from "@/components/ui/error-toast";
import TaskRow from "@/components/tasks/TaskRow";
import TaskEditorDialog, {
  type TaskEditorPayload,
} from "@/components/tasks/TaskEditorDialog";
import type { AppErrorSerialized, Task } from "@/api/ipc";
import {
  createTask,
  deleteTask,
  listTasks,
  setTaskStatus,
  updateTask,
} from "@/api/ipc";
import { t } from "@/i18n/t";

// 列表视图: 挂载拉取全部任务 (FR-002 顺序由 Rust 端保证), 渲染真实
// 数据 / 空状态 / 错误 toast (FR-008); 新建/编辑/删除三流程 (US1/4/5),
// 状态循环点击直发 set_task_status (US3)。
export default function ListView() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<AppErrorSerialized | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const refresh = useCallback(async () => {
    const result = await listTasks();
    if (result.ok) {
      setTasks(result.data);
    } else {
      setError(result.error);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setEditorOpen(true);
  }

  async function handleEditorSubmit(payload: TaskEditorPayload) {
    const result = editing
      ? await updateTask({ id: editing.id, ...payload })
      : await createTask(payload);
    if (result.ok) {
      setEditorOpen(false);
      setEditing(null);
      await refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleStatusCycle(id: number, nextStatus: Parameters<typeof setTaskStatus>[1]) {
    const result = await setTaskStatus(id, nextStatus);
    if (result.ok) {
      await refresh();
    } else {
      // 如 task_not_found (任务已被其他入口删除) — 通用文案, 不崩溃 (US5-4)
      setError(result.error);
      await refresh();
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    const result = await deleteTask(deleting.id);
    if (result.ok) {
      setDeleting(null);
      await refresh();
    } else {
      setError(result.error);
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button onClick={openCreate}>{t("tasks.new")}</Button>
      </div>

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
          onStatusCycle={(id, next) => void handleStatusCycle(id, next)}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      ))}

      <TaskEditorDialog
        open={editorOpen}
        mode={editing ? "edit" : "create"}
        task={editing}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        onSubmit={(payload) => void handleEditorSubmit(payload)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={t("tasks.delete_confirm_title", { title: trunc(deleting?.title) })}
        message={t("tasks.delete_confirm_message")}
        confirmLabel={t("tasks.delete_confirm_button")}
        cancelLabel={t("tasks.editor.cancel")}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleting(null)}
      />

      {error && <ErrorToast error={error} />}
    </div>
  );
}

function trunc(title: string | undefined): string {
  if (!title) return "";
  return title.length > 20 ? `${title.slice(0, 20)}…` : title;
}
