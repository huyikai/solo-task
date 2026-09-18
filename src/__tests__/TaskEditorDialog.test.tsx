import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
  // jsdom 下 radix floating 链路本身极慢 (真实浏览器毫秒级, WKWebView
  // probe 已证); 该用例需要完整 popover 交互, 放宽超时。
  test("picking a day from the calendar sets the field and payload", { timeout: 90_000 }, async () => {
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

    // 打开日历 (Popover), 选当月 20 日。fireEvent 同步派发: ref 修复后
    // floating-ui 走真实定位链, jsdom 无 layout, userEvent 的 pointer
    // 序列会在此环境挂起。
    fireEvent.click(within(dialog).getByRole("button", { name: "选择日期" }));
    const grid = await screen.findByRole("grid");
    // 回归守卫: modal Dialog 会把 body pointer-events 置 none, 日历内容
    // portal 在 body 下, 必须显式恢复, 否则真机点不动 (jsdom 测不出)。
    const popoverContent = document.querySelector('[data-slot="popover-content"]');
    expect(popoverContent).not.toBeNull();
    expect((popoverContent as HTMLElement).style.pointerEvents).toBe("auto");
    const dayButton = within(grid)
      .getAllByRole("button")
      .find((b) => b.textContent === "20");
    expect(dayButton).toBeDefined();
    fireEvent.click(dayButton!);

    // 触发按钮显示所选日, 提交载荷带 UTC 零点 RFC3339
    expect(await within(dialog).findByText("2026-09-20")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "保存" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ due_at: "2026-09-20T00:00:00Z" }),
    );
  });
});

describe("TaskEditorDialog visual spec (design.md §6.7, v1.1.0)", () => {
  test("dialog width locked to sm:max-w-[425px] (shadcn form convention)", () => {
    render(
      <TaskEditorDialog
        open
        mode="create"
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content?.classList.contains("sm:max-w-[425px]")).toBe(true);
  });

  test("selected priority option carries the §6.6 shadow-sm elevation cue", () => {
    render(
      <TaskEditorDialog
        open
        mode="create"
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "优先级" });
    const selected = within(group).getByRole("radio", { name: "无" });
    expect(selected).toHaveAttribute("aria-checked", "true");
    // 无 shadow 的选中态在视觉评审中被误读为"没有选中态"
    expect(selected.classList.contains("shadow-sm")).toBe(true);
  });
});
