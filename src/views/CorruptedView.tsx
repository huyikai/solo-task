import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportJson } from "@/api/ipc";
import { t } from "@/i18n/t";

interface CorruptedViewProps {
  onOpenSettings?: () => void;
}

export default function CorruptedView({ onOpenSettings }: CorruptedViewProps) {
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const path = await save({
        defaultPath: `solo-task-export-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return; // 用户取消
      const result = await exportJson(path);
      if (result.ok) {
        setSuccess(t("corrupted.export_success"));
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 px-6 py-16">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--warning)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      <h1 className="text-2xl font-semibold">{t("corrupted.title")}</h1>

      <p className="max-w-[65ch] text-center text-base text-text-muted">
        {t("corrupted.message")}
      </p>

      <div className="flex items-center gap-3">
        <Button
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          {exporting ? t("corrupted.exporting") : t("corrupted.export")}
        </Button>
        {onOpenSettings && (
          <Button variant="ghost" onClick={onOpenSettings}>
            {t("corrupted.open_settings")}
          </Button>
        )}
      </div>

      {success && (
        <p className="text-sm" style={{ color: "var(--success)" }}>
          {success}
        </p>
      )}
    </main>
  );
}
