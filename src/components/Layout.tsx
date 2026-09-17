import type { ReactNode } from "react";
import { t } from "@/i18n/t";

interface LayoutProps {
  onOpenSettings?: () => void;
  activeTab?: ReactNode;
  headerLeft?: ReactNode;
  children: ReactNode;
}

export default function Layout({
  onOpenSettings,
  activeTab,
  headerLeft,
  children,
}: LayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <header
        className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-surface px-6"
        data-testid="app-header"
      >
        <div className="flex items-center">
          {headerLeft ?? <span className="text-base font-medium">Solo Task</span>}
        </div>
        <div className="flex justify-center">{activeTab}</div>
        <div className="flex justify-end">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-md p-2 text-text-muted transition-colors duration-150 hover:bg-bg hover:text-text-primary"
              aria-label={t("app.settings")}
            >
              <svg
                width="20"
                height="20"
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
          )}
        </div>
      </header>
      <main className="flex-1 overflow-auto bg-bg p-6">{children}</main>
    </div>
  );
}
