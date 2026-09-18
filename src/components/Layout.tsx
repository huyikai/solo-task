import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  /** 主区域 className override. */
  className?: string;
  children: ReactNode;
}

/**
 * 透明 Layout: 主内容从窗口最顶部开始, 标题栏由 TitleBar 浮动提供.
 * 设置齿轮等浮动 UI 由调用方在 App.tsx 中以 fixed 定位实现.
 */
export default function Layout({ className, children }: LayoutProps) {
  return (
    <div className="flex h-full flex-col bg-bg">
      <main className={cn("relative flex-1 overflow-auto p-6 pt-12", className)}>
        {children}
      </main>
    </div>
  );
}