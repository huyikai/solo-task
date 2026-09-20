import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import TitleBar from "@/components/TitleBar";

// v1.1.1: 红绿灯交给 macOS 原生 Overlay (cc-switch 同款)。TitleBar 退化为
// 纯拖拽条 — 顶部空白带仍可拖窗, 但不再画任何按钮 (样式/顺序/hover 全部
// OS-owned, 自绘已被否决)。
describe("TitleBar is a pure drag strip (v1.1.1)", () => {
  test("renders one drag-region strip and zero buttons", () => {
    const { container } = render(<TitleBar />);
    const strip = container.firstElementChild as HTMLElement;

    expect(strip).not.toBeNull();
    expect(strip.hasAttribute("data-tauri-drag-region")).toBe(true);
    expect(strip.className).toContain("h-12");
    expect(strip.className).toContain("z-40");
    expect(strip.querySelectorAll("button")).toHaveLength(0);
  });
});
