import { i18nKeyFor, type AppErrorSerialized } from "@/api/ipc";
import { t } from "@/i18n/t";

export function ErrorToast({ error }: { error: AppErrorSerialized }) {
  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-base text-text-primary shadow-md"
    >
      {t(i18nKeyFor(error))}
    </div>
  );
}
