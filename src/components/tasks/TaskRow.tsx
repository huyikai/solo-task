import { Button } from "@/components/ui/button";
import type { Task, TaskStatus } from "@/api/ipc";
import { t } from "@/i18n/t";

// 状态循环顺序 (spec US3 锁定决策): todo → doing → done → todo。
// 循环是展示层关注点 (plan.md D2); Rust 端只校验取值合法。
const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo: "doing",
  doing: "done",
  done: "todo",
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "text-text-subtle border-border",
  doing: "text-warning border-warning",
  done: "text-success border-success",
};

interface TaskRowProps {
  task: Task;
  /** 点击状态徽标: 传入任务 id 与循环后的下一状态 (todo→doing→done→todo)。 */
  onStatusCycle: (id: number, nextStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskRow({ task, onStatusCycle, onEdit, onDelete }: TaskRowProps) {
  const dueDate = task.due_at ? task.due_at.slice(0, 10) : null;
  const nextStatus = STATUS_CYCLE[task.status];

  return (
    <div
      data-testid="task-row"
      data-task-id={task.id}
      className="flex h-12 items-center gap-3 rounded-md border border-border bg-surface px-3 transition-colors duration-150 hover:bg-muted"
    >
      <button
        type="button"
        onClick={() => onStatusCycle(task.id, nextStatus)}
        title={t("tasks.status.cycle_hint")}
        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 hover:opacity-80 ${STATUS_STYLE[task.status]}`}
      >
        {t(`tasks.status.${task.status}`)}
      </button>

      <span className="min-w-0 flex-1 truncate text-base text-text-primary">
        {task.title}
      </span>

      {task.priority !== "none" && (
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs text-text-muted">
          {t(`tasks.priority.${task.priority}`)}
        </span>
      )}

      {dueDate && (
        <span className="shrink-0 text-xs text-text-muted">
          {t("tasks.due")} {dueDate}
        </span>
      )}

      <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
        {t("tasks.edit")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onDelete(task)}>
        {t("tasks.delete")}
      </Button>
    </div>
  );
}

export default TaskRow;
