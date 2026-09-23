import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// 004 FR-005 / plan D2: macOS Overlay 标题栏的"双箭头"按钮由前端透明
// 覆盖按钮接管,语义改为 setFullscreen(!isFullscreen()) 二态切换。

const mockSetFullscreen = vi.fn();
const mockIsFullscreen = vi.fn();

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    setFullscreen: mockSetFullscreen,
    isFullscreen: mockIsFullscreen,
  }),
}));

const { WindowControls } = await import("@/components/WindowControls");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WindowControls (004 FR-005 double-arrow overlay)", () => {
  test("renders one transparent overlay button over the native control", () => {
    const { container } = render(<WindowControls />);
    const btn = screen.getByRole("button", { name: "toggle fullscreen" });
    expect(btn).not.toBeNull();
    expect(btn.classList.contains("pointer-events-auto")).toBe(true);
    expect(btn.classList.contains("bg-transparent")).toBe(true);
    // 位置锁定 (覆盖 Native 双箭头 ≈ left-2 top-2, 命中区约 48x48)
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.classList.contains("absolute")).toBe(true);
  });

  test("clicking toggles fullscreen (current full → false, current not full → true)", async () => {
    const user = userEvent.setup();
    mockIsFullscreen.mockResolvedValue(false);
    const { rerender } = render(<WindowControls />);
    await user.click(screen.getByRole("button", { name: "toggle fullscreen" }));
    expect(mockSetFullscreen).toHaveBeenLastCalledWith(true);

    mockIsFullscreen.mockResolvedValue(true);
    rerender(<WindowControls />);
    await user.click(screen.getByRole("button", { name: "toggle fullscreen" }));
    expect(mockSetFullscreen).toHaveBeenLastCalledWith(false);
  });
});