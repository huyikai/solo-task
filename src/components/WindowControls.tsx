// 004-tray-and-window-controls (FR-005 / plan D2): macOS Overlay 标题栏
// 原生"双箭头"按钮的 setFullscreen(!isFullscreen()) 接管组件。原 hover
// 视觉(绿色圈 + 放大/还原图标)被覆盖层遮掉,换来二态可预测的切换。

import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * 透明覆盖层: 叠在 macOS 原生"双箭头"按钮位置 (titleBarStyle: Overlay
 * 下原生按钮约 left-2 top-2, 大小 14x16 — 我们覆盖 48x48 命中区,
 * 透明的视觉圆形与原生一致)。
 *
 * 应置于 z-50(标题栏之上)之下,放 Layout 内容层;Tab 行 (z-[60]) 会在
 * 内容区被覆盖,符合期望。App.tsx 集成时需放在 Layout 之外、Tabs 之前。
 */
export function WindowControls() {
  return (
    <div className="absolute left-2 top-2 z-50 pointer-events-none">
      <button
        type="button"
        aria-label="toggle fullscreen"
        className="pointer-events-auto flex h-12 w-12 items-center justify-center bg-transparent"
        onClick={async () => {
          const win = getCurrentWindow();
          const current = await win.isFullscreen();
          await win.setFullscreen(!current);
        }}
      />
    </div>
  );
}

export default WindowControls;