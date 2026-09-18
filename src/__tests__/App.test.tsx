import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App";
import * as ipc from "@/api/ipc";

vi.mock("@/api/ipc", () => ({
  healthCheck: vi.fn(),
}));

const mockedHealthCheck = vi.mocked(ipc.healthCheck);

describe("App view switching (S1, S7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedHealthCheck.mockResolvedValue({ ok: true, data: { ok: true } });
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
    expect(listTab).toHaveAttribute("data-state", "active");
  });

  test("clicking board tab switches active view", async () => {
    const user = userEvent.setup();
    render(<App />);
    const boardTab = await screen.findByRole("tab", { name: "看板" });
    await user.click(boardTab);
    expect(boardTab).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("tab", { name: "列表" })).toHaveAttribute(
      "data-state",
      "inactive",
    );
  });

  test("clicking gantt tab switches active view", async () => {
    const user = userEvent.setup();
    render(<App />);
    const ganttTab = await screen.findByRole("tab", { name: "甘特图" });
    await user.click(ganttTab);
    expect(ganttTab).toHaveAttribute("data-state", "active");
  });

  test("active view shows placeholder content", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("tablist");
    expect(screen.getAllByText("Hello Solo Task").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: "看板" }));
    expect(screen.getAllByText("Hello Solo Task").length).toBeGreaterThan(0);
  });
});
