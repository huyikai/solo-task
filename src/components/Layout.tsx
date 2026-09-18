import type { ReactNode } from "react";
import { t } from "@/i18n/t";
import { cn } from "@/lib/utils";

interface LayoutProps {
  /** 右上角控件 (设置齿轮等). 缺省 = 自动渲染齿轮按钮, 传 null = 不渲染. */
  onOpenSettings?: (() => void) | null;
  /** 右上角自定义节点. 优先于 onOpenSettings. */
  headerRight?: ReactNode;
  /** 主区域 className override. */
  className?: string;
  children: ReactNode;
}

function SettingsGear({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("app.settings")}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted",
        "transition-colors duration-150 hover:bg-bg hover:text-text-primary",
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );
}

/**
 * 透明 Layout: 主内容从窗口最顶部开始, 标题栏由 TitleBar 浮动提供.
 * 这里只管 (tabs 区 + 主内容) + 设置齿轮.
 */
export default function Layout({
  onOpenSettings,
  headerRight,
  className,
  children,
}: LayoutProps) {
  const rightSlot =
    headerRight ??
    (onOpenSettings ? <SettingsGear onClick={onOpenSettings} /> : null);

  return (
    <div className="flex h-full flex-col bg-bg">
      {rightSlot && (
        <div className="flex justify-end px-6 pt-3">{rightSlot}</div>
      )}
      <main className={cn("flex-1 overflow-auto p-6", className)}>{children}</main>
    </div>
  );
}
