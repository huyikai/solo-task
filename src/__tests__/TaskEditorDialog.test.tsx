import { describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskEditorDialog from "@/components/tasks/TaskEditorDialog";
import type { Task } from "@/api/ipc";

const fixtureTask: Task = {
  id: 7,
  title: "交报告",
  description: "季度报告",
  status: "todo",
  priority: "high",
  due_at: "2026-09-20T00:00:00Z",
  created_at: "2026-09-18T08:00:00Z",
  updated_at: "2026-09-18T08:00:00Z",
};

describe("TaskEditorDialog (create mode)", () => {
  test("save button disabled while title is empty", () => {
    render(
      <TaskEditorDialog
        open
        mode="create"
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    const save = within(dialog).getByRole("button", { name: "保存" });
    expect(save).toBeDisabled();
  });

  test("submits structured payload with title and priority", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TaskEditorDialog
        open
        mode="create"
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("标题"), "买牛奶");

    // 优先级分段控件 (design.md §6.6 radiogroup 模式)
    const group = within(dialog).getByRole("radiogroup", { name: "优先级" });
    await user.click(within(group).getByRole("radio", { name: "高" }));

    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      title: "买牛奶",
      description: "",
      priority: "high",
      due_at: null,
    });
  });

  test("title input is capped at 200 chars (FR-006 char count)", () => {
    render(
      <TaskEditorDialog
        open
        mode="create"
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const title = screen.getByLabelText("标题");
    expect(title).toHaveAttribute("maxLength", "200");
  });
});

describe("TaskEditorDialog (edit mode)", () => {
  test("prefills fields from the task", () => {
    render(
      <TaskEditorDialog
        open
        mode="edit"
        task={fixtureTask}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("标题")).toHaveValue("交报告");
    expect(within(dialog).getByLabelText("描述")).toHaveValue("季度报告");
    const group = within(dialog).getByRole("radiogroup", { name: "优先级" });
    expect(within(group).getByRole("radio", { name: "高" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    // 日期触发按钮按存储的 Y-M-D 显示 (shadcn DatePicker 模式)
    expect(within(dialog).getByText("2026-09-20")).toBeInTheDocument();
  });

  test("submits edited payload with explicit due date", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TaskEditorDialog
        open
        mode="edit"
        task={fixtureTask}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const dialog = screen.getByRole("dialog");
    await user.clear(within(dialog).getByLabelText("标题"));
    await user.type(within(dialog).getByLabelText("标题"), "交终版报告");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "交终版报告",
      description: "季度报告",
      priority: "high",
      due_at: "2026-09-20T00:00:00Z",
    });
  });

  test("clearing the date submits due_at null", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TaskEditorDialog
        open
        mode="edit"
        task={fixtureTask}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "清除" }));
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ due_at: null }),
    );
  });
});

describe("TaskEditorDialog (calendar picker)", () => {
  test("picking a day from the calendar sets the field and payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TaskEditorDialog
        open
        mode="create"
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("标题"), "有截止日");

    // 打开日历 (Popover), 选当月 20 日 (rdp 的日按钮可访问名是完整日期
    // 文案, 按可见文本过滤最稳定)
    await user.click(
      within(dialog).getByRole("button", { name: "选择日期" }),
    );
    const grid = await screen.findByRole("grid");
    const dayButton = within(grid)
      .getAllByRole("button")
      .find((b) => b.textContent === "20");
    expect(dayButton).toBeDefined();
    await user.click(dayButton!);

    // 触发按钮显示所选日, 提交载荷带 UTC 零点 RFC3339
    expect(within(dialog).getByText("2026-09-20")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "保存" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ due_at: "2026-09-20T00:00:00Z" }),
    );
  });
});
