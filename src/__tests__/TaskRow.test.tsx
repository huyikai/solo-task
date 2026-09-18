import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskRow from "@/components/tasks/TaskRow";
import type { Task, TaskStatus } from "@/api/ipc";

function task(status: TaskStatus): Task {
  return {
    id: 1,
    title: "买牛奶",
    description: "",
    status,
    priority: "none",
    due_at: null,
    created_at: "2026-09-18T00:00:00Z",
    updated_at: "2026-09-18T00:00:00Z",
  };
}

const LABELS: Record<TaskStatus, string> = {
  todo: "待办",
  doing: "进行中",
  done: "已完成",
};

describe("TaskRow status cycling (S3, spec US3 lock: todo→doing→done→todo)", () => {
  test.each([
    ["todo", "doing"],
    ["doing", "done"],
    ["done", "todo"],
  ] as const)("clicking %s emits (%i, %s)", async (current, next) => {
    const user = userEvent.setup();
    const onStatusCycle = vi.fn();
    render(
      <TaskRow
        task={task(current)}
        onStatusCycle={onStatusCycle}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: LABELS[current] }));
    expect(onStatusCycle).toHaveBeenCalledTimes(1);
    expect(onStatusCycle).toHaveBeenCalledWith(1, next);
  });

  test("renders localized status labels for doing and done", () => {
    for (const status of ["doing", "done"] as const) {
      const { unmount } = render(
        <TaskRow task={task(status)} onStatusCycle={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />,
      );
      expect(
        screen.getByRole("button", { name: LABELS[status] }),
      ).toBeInTheDocument();
      unmount();
    }
  });

  test("edit and delete buttons invoke callbacks", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <TaskRow task={task("todo")} onStatusCycle={vi.fn()} onEdit={onEdit} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole("button", { name: "编辑" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
