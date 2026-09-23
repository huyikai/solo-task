import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// 004 US3 / FR-007/008: Settings 外观分组新增"关闭按钮"二选一控件,
// 沿用 §6.6 ThemeSwitcher 视觉语言 (bg-bg + font-medium + shadow-sm),
// 变更调 setPreference("window.close_action", JSON.stringify(value))。

const mockGetPreference = vi.fn();
const mockSetPreference = vi.fn();

vi.mock("@/api/ipc", () => ({
  getPreference: mockGetPreference,
  setPreference: mockSetPreference,
}));

vi.mock("@/i18n/t", () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      "settings.close_action.label": "关闭按钮",
      "settings.close_action.minimize_to_tray": "退回菜单栏",
      "settings.close_action.quit": "退出应用",
    };
    return map[key] ?? key;
  },
}));

const { SettingsCloseAction } = await import("@/components/SettingsCloseAction");

beforeEach(() => {
  mockGetPreference.mockReset();
  mockSetPreference.mockReset();
  mockSetPreference.mockResolvedValue({ ok: true, data: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SettingsCloseAction (004 US3)", () => {
  test("默认选中 'minimize_to_tray', 选中项含 shadow-sm (§6.6 视觉锁定)", async () => {
    mockGetPreference.mockResolvedValue({
      ok: true,
      data: { key: "window.close_action", value: '"minimize_to_tray"', updated_at: "2026-09-20T00:00:00Z" },
    });
    render(<SettingsCloseAction />);

    const group = await screen.findByRole("radiogroup", { name: "关闭按钮" });
    const selected = within(group).getByRole("radio", { name: "退回菜单栏" });
    expect(selected).toHaveAttribute("aria-checked", "true");
    // §6.6 锁定: 选中态含 shadow-sm (否则视觉评审中误读为无选中态)
    expect(selected.classList.contains("shadow-sm")).toBe(true);
    expect(selected.classList.contains("font-medium")).toBe(true);
  });

  test("点击 '退出应用' → 调 setPreference with '\"quit\"' JSON 字面量", async () => {
    const user = userEvent.setup();
    mockGetPreference.mockResolvedValue({
      ok: true,
      data: { key: "window.close_action", value: '"minimize_to_tray"', updated_at: "2026-09-20T00:00:00Z" },
    });
    render(<SettingsCloseAction />);

    const group = await screen.findByRole("radiogroup", { name: "关闭按钮" });
    await user.click(within(group).getByRole("radio", { name: "退出应用" }));

    expect(mockSetPreference).toHaveBeenCalledWith(
      "window.close_action",
      '"quit"',
    );
  });

  test("已有 quit 偏好时初始化即选中 '退出应用'", async () => {
    mockGetPreference.mockResolvedValue({
      ok: true,
      data: { key: "window.close_action", value: '"quit"', updated_at: "2026-09-20T00:00:00Z" },
    });
    render(<SettingsCloseAction />);

    const group = await screen.findByRole("radiogroup", { name: "关闭按钮" });
    expect(within(group).getByRole("radio", { name: "退出应用" })).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByRole("radio", { name: "退回菜单栏" })).toHaveAttribute("aria-checked", "false");
  });

  test("偏好缺失 → 默认 minimize_to_tray (US3-4 fallback)", async () => {
    mockGetPreference.mockResolvedValue({ ok: false, error: { variant: "unknown" } });
    render(<SettingsCloseAction />);

    const group = await screen.findByRole("radiogroup", { name: "关闭按钮" });
    expect(within(group).getByRole("radio", { name: "退回菜单栏" })).toHaveAttribute("aria-checked", "true");
  });
});