import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "@/views/Settings";
import * as ipc from "@/api/ipc";

vi.mock("@/api/ipc", () => ({
  getPreference: vi.fn(),
  setPreference: vi.fn(),
  triggerTestError: vi.fn(),
}));

const mockedGetPreference = vi.mocked(ipc.getPreference);
const mockedSetPreference = vi.mocked(ipc.setPreference);
const mockedTriggerTestError = vi.mocked(ipc.triggerTestError);

// jsdom doesn't implement matchMedia; Settings reads it during useState init.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("Settings (S2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认对所有 key 都返回合理响应; 子调用按 key 决定 (theme.mode +
    // window.close_action 都覆盖; 测试可以按 key 重置)
    mockedGetPreference.mockImplementation(async (key: string) => ({
      ok: true,
      data: { key, value: '"system"', updated_at: "2026-01-01T00:00:00Z" },
    }));
    mockedSetPreference.mockResolvedValue({ ok: true, data: null });
    mockedTriggerTestError.mockResolvedValue({
      ok: false,
      error: { variant: "db_locked", message: "test" },
    });
  });

  test("renders the two required buttons", async () => {
    render(<Settings />);
    expect(
      await screen.findByRole("button", { name: "检查更新" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "清除所有数据" }),
    ).toBeInTheDocument();
  });

  test("clear-data confirm dialog requires typed expectedText", async () => {
    const user = userEvent.setup();
    render(<Settings />);
    await user.click(screen.getByRole("button", { name: "清除所有数据" }));

    const dialog = await screen.findByRole("dialog");
    const confirmBtn = within(dialog).getByRole("button", { name: "确认清除" });
    expect(confirmBtn).toBeDisabled();

    const input = within(dialog).getByTestId("confirm-input");
    await user.type(input, "wrong-text");
    expect(confirmBtn).toBeDisabled();

    await user.clear(input);
    await user.type(input, "DELETE");
    expect(confirmBtn).toBeEnabled();
  });
});
