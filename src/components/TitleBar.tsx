import { cn } from "@/lib/utils";
import { getCurrentWindow } from "@tauri-apps/api/window";

const isMac = navigator.platform.toUpperCase().includes("MAC");

interface TitleBarProps {
  children?: React.ReactNode;
}

/**
 * 透明 TitleBar: 不渲染背景条, 仅在左上角浮动三个窗口控制按钮.
 * Tab / 设置入口等 UI 由 Layout 渲染, 不再有 h-9 占位.
 */
export function TitleBar(_: TitleBarProps = {}) {
  return (
    <div
      data-tauri-drag-region
      className="fixed left-0 top-0 z-50 flex h-9 items-center gap-1.5 pl-3 pr-3 pointer-events-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div
        className="pointer-events-auto flex items-center gap-1.5"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <WindowButton
          variant={isMac ? "traffic" : "minimize"}
          onClick={() => void getCurrentWindow().minimize()}
          label="minimize"
          color="#ffbd2e"
        />
        {isMac ? (
          <WindowButton
            variant="traffic"
            onClick={() => void getCurrentWindow().toggleMaximize()}
            label="maximize"
            color="#28c940"
          />
        ) : (
          <WindowButton
            variant="maximize"
            onClick={() => void getCurrentWindow().toggleMaximize()}
            label="maximize"
          />
        )}
        <WindowButton
          variant={isMac ? "traffic" : "close"}
          onClick={() => void getCurrentWindow().close()}
          label="close"
          color="#ff5f57"
        />
      </div>
    </div>
  );
}

interface WindowButtonProps {
  variant: "traffic" | "minimize" | "maximize" | "close";
  onClick: () => void;
  label: string;
  color?: string;
}

function WindowButton({ variant, onClick, label, color }: WindowButtonProps) {
  if (variant === "traffic") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          "group flex h-3 w-3 items-center justify-center rounded-full",
          "transition-opacity",
        )}
        style={{ background: color }}
      >
        <svg
          width="6"
          height="6"
          viewBox="0 0 6 6"
          fill="none"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="1"
          strokeLinecap="round"
          aria-hidden="true"
          className="opacity-0 group-hover:opacity-100"
        >
          {label === "minimize" && <line x1="0.5" y1="3" x2="5.5" y2="3" />}
          {label === "maximize" && (
            <>
              <line x1="0.5" y1="3" x2="5.5" y2="3" />
              <line x1="3" y1="0.5" x2="3" y2="5.5" />
            </>
          )}
          {label === "close" && (
            <>
              <line x1="0.5" y1="0.5" x2="5.5" y2="5.5" />
              <line x1="0.5" y1="5.5" x2="5.5" y2="0.5" />
            </>
          )}
        </svg>
      </button>
    );
  }

  const glyph = (() => {
    if (variant === "minimize") return <line x1="2" y1="9" x2="14" y2="9" />;
    if (variant === "maximize") return <rect x="2" y="2" width="12" height="12" />;
    return (
      <>
        <line x1="2" y1="2" x2="14" y2="14" />
        <line x1="2" y1="14" x2="14" y2="2" />
      </>
    );
  })();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group flex h-9 w-11 items-center justify-center text-text-muted",
        "transition-colors duration-150 hover:bg-bg hover:text-text-primary",
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        aria-hidden="true"
        className="opacity-0 group-hover:opacity-100"
      >
        {glyph}
      </svg>
    </button>
  );
}

export default TitleBar;
