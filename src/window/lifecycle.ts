// 004-tray-and-window-controls (FR-006 / plan D1): 关闭按钮拦截在 JS
// 端,读 user_preferences 的 `window.close_action` 决定 hide-to-tray
// 还是允许原生 quit。安装入口在 App.tsx 挂载时调用一次。
//
// 这是 spec 锁定的"单一真理源": Rust 端不注册 .on_window_event(守卫
// 测试在 lifecycle_tests.rs),决定权全在 JS,Settings UI 切换可见即生效。

import { getCurrentWindow } from "@tauri-apps/api/window";
import { getPreference } from "@/api/ipc";

export type CloseAction = "minimize_to_tray" | "quit";

const KEY = "window.close_action";

/** 解析偏好为 CloseAction;解析失败/缺值/未知值一律 fallback 到 minimize_to_tray。 */
export function parseCloseAction(raw: string | null | undefined): CloseAction {
  if (typeof raw !== "string") return "minimize_to_tray";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === "minimize_to_tray" || parsed === "quit") {
      return parsed;
    }
  } catch {
    // 不是合法 JSON
  }
  return "minimize_to_tray";
}

/** 安装关闭按钮拦截。在 App.tsx 挂载时 useEffect 调用一次。 */
export async function installCloseGuard(): Promise<void> {
  await getCurrentWindow().onCloseRequested(async (event) => {
    // 关闭时动态读偏好 (不在启动时缓存 — Settings 切换后下次关闭即生效)
    let action: CloseAction = "minimize_to_tray";
    try {
      const result = await getPreference(KEY);
      if (result.ok) {
        action = parseCloseAction(result.data.value);
      }
    } catch {
      // 调用链异常 → fallback minimize_to_tray
    }
    if (action === "quit") {
      // 不 preventDefault → Tauri 走原生 quit
      return;
    }
    event.preventDefault();
    await getCurrentWindow().hide();
  });
}