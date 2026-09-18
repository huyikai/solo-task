import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import * as ipc from "@/api/ipc";

vi.mock("@/api/ipc", () => ({
  healthCheck: vi.fn(),
  listTasks: vi.fn(),
}));

const mockedHealthCheck = vi.mocked(ipc.healthCheck);
const mockedListTasks = vi.mocked(
  ipc.listTasks as unknown as ReturnType<typeof vi.fn>,
);

describe("App view switching (S1, S7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHealthCheck.mockResolvedValue({ ok: true, data: { ok: true } });
    // ListView 挂载即拉取; 空数据 → 渲染空状态 (003 FR-008)
    mockedListTasks.mockResolvedValue({ ok: true, data: [] });
  });

  test("renders three view tabs after healthy startup", async () => {
    render(<App />);
    expect(await screen.findByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "列表" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "看板" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "甘特图" })).toBeInTheDocument();
  });

  test("initial active view is list", async () => {
    render(<App />);
    const listTab = await screen.findByRole("tab", { name: "列表" });
    expect(listTab).toHaveAttribute("aria-selected", "true");
  });

  test("clicking board tab switches active view", async () => {
    const user = userEvent.setup();
    render(<App />);
    const boardTab = await screen.findByRole("tab", { name: "看板" });
    await user.click(boardTab);
    expect(boardTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "列表" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("clicking gantt tab switches active view", async () => {
    const user = userEvent.setup();
    render(<App />);
    const ganttTab = await screen.findByRole("tab", { name: "甘特图" });
    await user.click(ganttTab);
    expect(ganttTab).toHaveAttribute("aria-selected", "true");
  });

  test("active view renders the real list (empty state) after switching", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("tablist");
    expect(await screen.findByText("还没有任务")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "看板" }));
    // 切回列表视图后仍正常渲染真实列表的空状态
    await user.click(screen.getByRole("tab", { name: "列表" }));
    expect(await screen.findByText("还没有任务")).toBeInTheDocument();
  });
});
