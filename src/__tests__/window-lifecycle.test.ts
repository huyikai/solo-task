import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// 004-tray-and-window-controls (FR-006 / plan D1): 关闭按钮拦截在 JS
// 端。安装入口在 App.tsx 挂载时调用一次,读
// `getPreference("window.close_action")` 决定 hide() 还是允许 quit。
//
// 这是 spec 锁定的"单一真理源": Rust 端不注册 .on_window_event(守卫测试
// 在 lifecycle_tests.rs),决定权全在 JS,Settings UI 切换可见即生效。

const mockOnCloseRequested = vi.fn();
const mockHide = vi.fn();
const mockShow = vi.fn();
const mockSetFocus = vi.fn();
const mockUnminimize = vi.fn();
const mockDestroy = vi.fn();

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: mockOnCloseRequested,
    hide: mockHide,
    show: mockShow,
    setFocus: mockSetFocus,
    unminimize: mockUnminimize,
    destroy: mockDestroy,
  }),
}));

const mockGetPreference = vi.fn();
const mockSetPreference = vi.fn();

vi.mock("@/api/ipc", () => ({
  getPreference: mockGetPreference,
  setPreference: mockSetPreference,
}));

const lifecycle = await import("@/window/lifecycle");

beforeEach(() => {
  mockOnCloseRequested.mockReset();
  mockHide.mockReset();
  mockShow.mockReset();
  mockSetFocus.mockReset();
  mockUnminimize.mockReset();
  mockDestroy.mockReset();
  mockGetPreference.mockReset();
  mockSetPreference.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("installCloseGuard (004 FR-006)", () => {
  test("registers onCloseRequested exactly once at app startup", async () => {
    mockGetPreference.mockResolvedValue({
      ok: true,
      data: { key: "window.close_action", value: '"minimize_to_tray"', updated_at: "2026-09-20T00:00:00Z" },
    });

    await lifecycle.installCloseGuard();

    expect(mockOnCloseRequested).toHaveBeenCalledTimes(1);
    expect(typeof mockOnCloseRequested.mock.calls[0][0]).toBe("function");
  });

  test("default (minimize_to_tray): preventDefault + hide, 不调用 quit", async () => {
    mockGetPreference.mockResolvedValue({
      ok: true,
      data: { key: "window.close_action", value: '"minimize_to_tray"', updated_at: "2026-09-20T00:00:00Z" },
    });

    await lifecycle.installCloseGuard();
    const handler = mockOnCloseRequested.mock.calls[0][0] as (
      ev: { preventDefault: () => void; isPreventDefault: () => boolean },
    ) => Promise<void>;
    const ev = { preventDefault: vi.fn(), isPreventDefault: () => false };
    await handler(ev);

    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockHide).toHaveBeenCalledTimes(1);
    expect(mockShow).not.toHaveBeenCalled();
  });

  test("quit mode: preventDefault + destroy (显式退出)", async () => {
    mockGetPreference.mockResolvedValue({
      ok: true,
      data: { key: "window.close_action", value: '"quit"', updated_at: "2026-09-20T00:00:00Z" },
    });

    await lifecycle.installCloseGuard();
    const handler = mockOnCloseRequested.mock.calls[0][0] as (
      ev: { preventDefault: () => void; isPreventDefault: () => boolean },
    ) => Promise<void>;
    const ev = { preventDefault: vi.fn(), isPreventDefault: () => false };
    await handler(ev);

    // preventDefault 必须同步调用 (在任何 await 之前), 否则 Tauri
    // 来不及检查 isPreventDefault 就销毁窗口
    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockHide).not.toHaveBeenCalled();
  });

  test("fallback: 偏好缺失/非法值 → 默认 minimize_to_tray, 不 panic", async () => {
    mockGetPreference.mockResolvedValue({ ok: false, error: { variant: "unknown" } });

    await lifecycle.installCloseGuard();
    const handler = mockOnCloseRequested.mock.calls[0][0] as (
      ev: { preventDefault: () => void; isPreventDefault: () => boolean },
    ) => Promise<void>;
    const ev = { preventDefault: vi.fn(), isPreventDefault: () => false };
    await handler(ev);

    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockHide).toHaveBeenCalledTimes(1);
  });

  test("fallback: value 是合法 JSON 但非合法 CloseAction → minimize_to_tray", async () => {
    mockGetPreference.mockResolvedValue({
      ok: true,
      data: { key: "window.close_action", value: '"something-weird"', updated_at: "2026-09-20T00:00:00Z" },
    });

    await lifecycle.installCloseGuard();
    const handler = mockOnCloseRequested.mock.calls[0][0] as (
      ev: { preventDefault: () => void; isPreventDefault: () => boolean },
    ) => Promise<void>;
    const ev = { preventDefault: vi.fn(), isPreventDefault: () => false };
    await handler(ev);

    expect(ev.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockHide).toHaveBeenCalledTimes(1);
  });
});