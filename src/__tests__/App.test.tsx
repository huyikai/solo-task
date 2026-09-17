import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import * as ipc from "@/api/ipc";

// Mock IPC layer — App 启动时会调用 healthCheck
vi.mock("@/api/ipc", () => ({
  healthCheck: vi.fn(),
}));

const mockedHealthCheck = vi.mocked(ipc.healthCheck);

describe("App view switching (S1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHealthCheck.mockResolvedValue({ ok: true, data: { ok: true } });
  });

  test("renders three view tabs after healthy startup", async () => {
    render(<App />);
    // 等 healthCheck resolve 后 UI 出现
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

  test("active view shows placeholder content", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("tablist");
    expect(screen.getByText("Hello Solo Task")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "看板" }));
    expect(screen.getByText("Hello Solo Task")).toBeInTheDocument();
  });
});
