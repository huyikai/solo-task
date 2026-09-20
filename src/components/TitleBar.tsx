/**
 * v1.1.1: 窗口控制交给 macOS 原生 Overlay 红绿灯 (tauri.conf.json
 * titleBarStyle), 本组件退化为纯顶部拖拽条 — 让 tabs 行上方的空白带
 * 仍可拖动窗口, 不渲染任何按钮 (顺序/hover/glyph 全部 OS-owned)。
 */
export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="fixed left-0 top-0 z-40 h-12 w-full"
    />
  );
}

export default TitleBar;
