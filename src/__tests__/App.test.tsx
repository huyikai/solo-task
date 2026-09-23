import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import * as ipc from "@/api/ipc";

vi.mock("@/api/ipc", () => ({
  healthCheck: vi.fn(),
  listTasks: vi.fn(),
  getPreference: vi.fn(),
  setPreference: vi.fn(),
}));

// 004: WindowControls + installCloseGuard 引用 @tauri-apps/api/window,
// jsdom 没有 Tauri runtime 故 stub。
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: vi.fn(),
    hide: vi.fn(),
    show: vi.fn(),
    setFocus: vi.fn(),
    unminimize: vi.fn(),
    setFullscreen: vi.fn(),
    isFullscreen: vi.fn().mockResolvedValue(false),
  }),
}));

const mockedHealthCheck = vi.mocked(ipc.healthCheck);
const mockedListTasks = vi.mocked(
  ipc.listTasks as unknown as ReturnType<typeof vi.fn>,
);
const mockedGetPreference = vi.mocked(ipc.getPreference);
const mockedSetPreference = vi.mocked(ipc.setPreference);

describe("App view switching (S1, S7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHealthCheck.mockResolvedValue({ ok: true, data: { ok: true } });
    // ListView 挂载即拉取; 空数据 → 渲染空状态 (003 FR-008)
    mockedListTasks.mockResolvedValue({ ok: true, data: [] });
    // 004 installCloseGuard 在 mount 时调 getPreference; 默认 fallback
    // minimize_to_tray, 不需真实返回值, 但 mock 必须返回对象避免 .ok 访问抛错
    mockedGetPreference.mockResolvedValue({ ok: false, error: { variant: "unknown" } });
    mockedSetPreference.mockResolvedValue({ ok: true, data: null });
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

  test("header row is a drag region without pointer-events gating (v1.1.1)", async () => {
    render(<App />);
    const tablist = await screen.findByRole("tablist");
    const row = tablist.parentElement;
    // 原生 Overlay 红绿灯后, z-50 遮挡条已删: 行容器直接承担拖拽
    // (data-tauri-drag-region, Tauri 只在事件 target 自身带属性时拖拽,
    // Tabs/齿轮子元素不带属性故可点击), 不再需要 pointer-events 补丁。
    expect(row?.hasAttribute("data-tauri-drag-region")).toBe(true);
    expect(row?.classList.contains("pointer-events-none")).toBe(false);
  });
});
