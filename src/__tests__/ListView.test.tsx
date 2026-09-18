import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListView from "@/views/ListView";
import * as ipc from "@/api/ipc";
import type { Task } from "@/api/ipc";

vi.mock("@/api/ipc", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  setTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
}));

const mockedListTasks = vi.mocked(ipc.listTasks);
const mockedCreateTask = vi.mocked(ipc.createTask);
const mockedUpdateTask = vi.mocked(ipc.updateTask);
const mockedSetTaskStatus = vi.mocked(ipc.setTaskStatus);
const mockedDeleteTask = vi.mocked(ipc.deleteTask);

function task(partial: Partial<Task> & { id: number; title: string }): Task {
  return {
    description: "",
    status: "todo",
    priority: "none",
    due_at: null,
    created_at: "2026-09-18T00:00:00Z",
    updated_at: "2026-09-18T00:00:00Z",
    ...partial,
  };
}

describe("ListView rendering (S2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders rows in created_at DESC order with fields", async () => {
    mockedListTasks.mockResolvedValue({
      ok: true,
      data: [
        task({ id: 3, title: "最新", status: "doing", priority: "high", created_at: "2026-09-18T03:00:00Z" }),
        task({ id: 2, title: "中间", created_at: "2026-09-18T02:00:00Z" }),
        task({ id: 1, title: "最早", due_at: "2026-09-20T00:00:00Z", created_at: "2026-09-18T01:00:00Z" }),
      ],
    });

    render(<ListView />);

    const rows = await screen.findAllByTestId("task-row");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("最新");
    expect(rows[1]).toHaveTextContent("中间");
    expect(rows[2]).toHaveTextContent("最早");

    // 状态徽标文案 (i18n)
    expect(within(rows[0]).getByText("进行中")).toBeInTheDocument();
    expect(within(rows[1]).getByText("待办")).toBeInTheDocument();
    expect(within(rows[2]).getByText("待办")).toBeInTheDocument();

    // 优先级标记
    expect(within(rows[0]).getByText("高")).toBeInTheDocument();

    // due_at 有 → 显示日期; 无 → 不显示
    expect(within(rows[2]).getByText(/2026-09-20/)).toBeInTheDocument();
    expect(within(rows[1]).queryByText(/截止/)).not.toBeInTheDocument();
  });

  test("renders empty state when no tasks", async () => {
    mockedListTasks.mockResolvedValue({ ok: true, data: [] });

    render(<ListView />);

    expect(await screen.findByText("还没有任务")).toBeInTheDocument();
    expect(screen.queryByTestId("task-row")).not.toBeInTheDocument();
  });

  test("empty state centers in the viewport remainder (design.md §6.7 v1.1.0)", async () => {
    mockedListTasks.mockResolvedValue({ ok: true, data: [] });

    render(<ListView />);

    // 列表容器 min-h-full 撑满主区域, 空态块 flex-1 + justify-center
    // 在剩余空间垂直居中 (原 py-16 在高窗口下头重脚轻)。
    const emptyBlock = (await screen.findByText("还没有任务")).parentElement;
    expect(emptyBlock?.classList.contains("flex-1")).toBe(true);
    expect(emptyBlock?.classList.contains("justify-center")).toBe(true);
    const listRoot = screen
      .getByRole("button", { name: "新建任务" })
      .closest(".min-h-full");
    expect(listRoot).not.toBeNull();
  });

  test("surfaces an error toast when listTasks fails", async () => {
    mockedListTasks.mockResolvedValue({
      ok: false,
      error: { variant: "db_locked" },
    });

    render(<ListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("数据库被锁定");
  });
});

describe("ListView CRUD flows (S1/S4/S5)", () => {
  const oneTask = () => ({
    ok: true as const,
    data: [task({ id: 1, title: "买牛奶" })],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateTask.mockResolvedValue({ ok: true, data: task({ id: 2, title: "x" }) });
    mockedUpdateTask.mockResolvedValue({ ok: true, data: task({ id: 1, title: "y" }) });
    mockedSetTaskStatus.mockResolvedValue({ ok: true, data: task({ id: 1, title: "买牛奶", status: "doing" }) });
    mockedDeleteTask.mockResolvedValue({ ok: true, data: null });
  });

  test("status cycle click calls setTaskStatus(id, next)", async () => {
    const user = userEvent.setup();
    mockedListTasks.mockResolvedValue(oneTask());
    render(<ListView />);

    await user.click(await screen.findByRole("button", { name: "待办" }));
    expect(mockedSetTaskStatus).toHaveBeenCalledWith(1, "doing");
  });

  test("set_task_status not_found surfaces the generic toast (spec US5-4)", async () => {
    const user = userEvent.setup();
    mockedListTasks.mockResolvedValue(oneTask());
    mockedSetTaskStatus.mockResolvedValue({
      ok: false,
      error: { variant: "task_not_found", message: "1" },
    });
    render(<ListView />);

    await user.click(await screen.findByRole("button", { name: "待办" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("操作失败");
  });

  test("create flow: open dialog, submit, calls createTask and refreshes", async () => {
    const user = userEvent.setup();
    mockedListTasks.mockResolvedValueOnce(oneTask()); // 初次加载
    mockedListTasks.mockResolvedValueOnce({
      ok: true,
      data: [task({ id: 2, title: "新任务" })],
    }); // 创建后刷新

    render(<ListView />);
    await user.click(await screen.findByRole("button", { name: "新建任务" }));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("标题"), "新任务");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    expect(mockedCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "新任务" }),
    );
    expect(await screen.findByText("新任务")).toBeInTheDocument();
  });

  test("edit flow: prefilled dialog calls updateTask and refreshes", async () => {
    const user = userEvent.setup();
    mockedListTasks.mockResolvedValueOnce(oneTask());
    mockedListTasks.mockResolvedValueOnce({
      ok: true,
      data: [task({ id: 1, title: "改过的" })],
    });

    render(<ListView />);
    await user.click(await screen.findByRole("button", { name: "编辑" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("标题")).toHaveValue("买牛奶");
    await user.clear(within(dialog).getByLabelText("标题"));
    await user.type(within(dialog).getByLabelText("标题"), "改过的");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    expect(mockedUpdateTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, title: "改过的" }),
    );
    expect(await screen.findByText("改过的")).toBeInTheDocument();
  });

  test("delete flow: confirm calls deleteTask and row disappears", async () => {
    const user = userEvent.setup();
    mockedListTasks.mockResolvedValueOnce(oneTask());
    mockedListTasks.mockResolvedValueOnce({ ok: true, data: [] });

    render(<ListView />);
    await user.click(await screen.findByRole("button", { name: "删除" }));

    const dialog = screen.getByRole("dialog");
    // 单任务删除不要求输入确认文字 (plan.md D7), 直接可确认
    await user.click(within(dialog).getByRole("button", { name: "确认删除" }));

    expect(mockedDeleteTask).toHaveBeenCalledWith(1);
    expect(await screen.findByText("还没有任务")).toBeInTheDocument();
  });

  test("delete cancel keeps the row", async () => {
    const user = userEvent.setup();
    mockedListTasks.mockResolvedValue(oneTask());
    render(<ListView />);

    await user.click(await screen.findByRole("button", { name: "删除" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "取消" }),
    );

    expect(mockedDeleteTask).not.toHaveBeenCalled();
    expect(screen.getByTestId("task-row")).toBeInTheDocument();
  });
});
