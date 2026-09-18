import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ListView from "@/views/ListView";
import * as ipc from "@/api/ipc";
import type { Task } from "@/api/ipc";

vi.mock("@/api/ipc", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listTasks: vi.fn(),
}));

const mockedListTasks = vi.mocked(ipc.listTasks);

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

  test("surfaces an error toast when listTasks fails", async () => {
    mockedListTasks.mockResolvedValue({
      ok: false,
      error: { variant: "db_locked" },
    });

    render(<ListView />);

    expect(await screen.findByRole("alert")).toHaveTextContent("数据库被锁定");
  });
});
