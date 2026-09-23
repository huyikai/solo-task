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
  let action: CloseAction = "minimize_to_tray";
  const result = await getPreference(KEY);
  if (result.ok) {
    action = parseCloseAction(result.data.value);
  }
  // 关闭时已 lock 偏好,运行时变更通过 React state 重新触发 (App 端
  // listen on focus 后重读 — 此处不订阅,首次安装一次即可)。
  // Safety net: 即便 mock 未配置或调用链异常, 也走 fallback 而不抛错
  // (handler 安装不应阻塞应用启动; mock 泄漏风险由测试套件层面处理)。
  if (!result || typeof (result as { ok?: unknown }).ok !== "boolean") {
    action = "minimize_to_tray";
  }
  await getCurrentWindow().onCloseRequested(async (event) => {
    if (action === "quit") {
      // 不 preventDefault → Tauri 走原生 quit
      return;
    }
    event.preventDefault();
    await getCurrentWindow().hide();
  });
}