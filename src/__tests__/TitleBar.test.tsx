import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

// 红绿灯是 12px 视觉圆点, 但命中区必须明显更大 (macOS 原生如此),
// 否则真机上几乎点不中。jsdom 的 navigator.platform 不是 Mac, 模块顶层
// 的 isMac 常量在静态导入时已定值 — 动态导入前先覆写。
describe("TitleBar traffic-light hit targets (macOS variant)", () => {
  test("each button exposes a 20px hit area around the 12px dot", async () => {
    Object.defineProperty(window.navigator, "platform", {
      value: "MacIntel",
      configurable: true,
    });
    const { default: TitleBar } = await import("@/components/TitleBar");
    render(<TitleBar />);

    for (const label of ["minimize", "maximize", "close"]) {
      const btn = screen.getByRole("button", { name: label });
      expect(btn.classList.contains("h-5")).toBe(true);
      expect(btn.classList.contains("w-5")).toBe(true);
      // 视觉圆点是内层 span, 按钮本身只是命中区 (不能把颜色铺满按钮)
      expect(btn.querySelector("span")).not.toBeNull();
    }
  });
});
