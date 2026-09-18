import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/api/ipc";
import { t } from "@/i18n/t";

// 新建/编辑共用一个对话框 (plan.md D6)。字段集与 contracts/ipc.md 的
// NewTaskInput / TaskPatchInput 一致; 优先级选择器复用 design.md §6.6
// 的 segmented radiogroup 模式 (与 ThemeSwitcher 同一视觉语言)。

const PRIORITIES: TaskPriority[] = ["none", "low", "med", "high"];

export interface TaskEditorPayload {
  title: string;
  description: string;
  priority: TaskPriority;
  due_at: string | null;
}

interface TaskEditorDialogProps {
  open: boolean;
  mode: "create" | "edit";
  task?: Task | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: TaskEditorPayload) => void;
}

export function TaskEditorDialog({
  open,
  mode,
  task,
  onOpenChange,
  onSubmit,
}: TaskEditorDialogProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>("none");
  const [dueDate, setDueDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      // RFC3339 → 按存储字符串的年月日构造本地零点 (跨时区稳定)
      if (task.due_at) {
        const [y, m, d] = task.due_at.slice(0, 10).split("-").map(Number);
        setDueDate(new Date(y, m - 1, d));
      } else {
        setDueDate(null);
      }
    } else {
      setTitle("");
      setDescription("");
      setPriority("none");
      setDueDate(null);
    }
  }, [open, mode, task]);

  const trimmed = title.trim();
  const canSave = trimmed.length > 0 && trimmed.length <= 200;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSubmit({
      title: trimmed,
      description,
      priority,
      due_at: dueDate ? formatRfc3339Utc(dueDate) : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? t("tasks.editor.edit_title") : t("tasks.editor.create_title")}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" ? t("tasks.editor.edit_hint") : t("tasks.editor.create_hint")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t("tasks.editor.title_label")}</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t("tasks.editor.description_label")}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              data-slot="input"
              className={cn(
                "border-input flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
                "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t("tasks.editor.priority_label")}</span>
            <div
              role="radiogroup"
              aria-label={t("tasks.editor.priority_label")}
              className="flex gap-1 rounded-md border border-border p-1"
            >
              {PRIORITIES.map((p) => {
                const selected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "h-8 flex-1 rounded-md px-3 text-sm transition-colors duration-150",
                      selected
                        ? "bg-bg font-medium text-text-primary"
                        : "text-text-muted hover:text-text-primary",
                    )}
                  >
                    {t(`tasks.priority.${p}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t("tasks.editor.due_label")}</span>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full flex-1 justify-start font-normal",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon />
                    {dueDate ? fmtDate(dueDate) : t("tasks.editor.pick_date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                  // Radix 的 modal Dialog 会把 body 的 pointer-events 置 none,
                  // portal 到 body 的 Popover 内容会继承到 (真实 WebView 里
                  // 整个日历点不动; jsdom 无命中测试故测试仍绿)。在使用点
                  // 强制恢复 — Radix 社区对 Popover-in-Dialog 的标准解法。
                  style={{ pointerEvents: "auto" }}
                >
                  <Calendar
                    mode="single"
                    selected={dueDate ?? undefined}
                    onSelect={(d) => setDueDate(d ?? null)}
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setDueDate(null)}>
                  {t("tasks.editor.clear_date")}
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("tasks.editor.cancel")}
            </Button>
            <Button type="submit" disabled={!canSave}>
              {t("tasks.editor.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TaskEditorDialog;

/** 所选日历日 → UTC 零点 RFC3339 (跨时区稳定, 契约见 contracts/ipc.md)。 */
function formatRfc3339Utc(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00Z`;
}

function fmtDate(date: Date): string {
  return formatRfc3339Utc(date).slice(0, 10);
}
