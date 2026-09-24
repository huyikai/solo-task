// 004-tray-and-window-controls (FR-005 / plan D2): macOS Overlay 标题栏
// 原生"双箭头"按钮的 setFullscreen(!isFullscreen()) 接管组件。原 hover
// 视觉(绿色圈 + 放大/还原图标)被覆盖层遮掉,换来二态可预测的切换。

import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * 透明覆盖层: 叠在 macOS 原生"双箭头"(绿色最大化)按钮位置。
 * macOS 红绿灯从左到右: 关闭(红) / 最小化(黄) / 最大化(绿),
 * 三键约在 left 20/40/60px, 直径 12px。覆盖层只盖绿色键,
 * 不得压住红/黄键 (会导致关闭/最小化失灵)。
 */
export function WindowControls() {
  return (
    <div className="absolute left-[52px] top-2 z-50 pointer-events-none">
      <button
        type="button"
        aria-label="toggle fullscreen"
        className="pointer-events-auto flex h-8 w-8 items-center justify-center bg-transparent"
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