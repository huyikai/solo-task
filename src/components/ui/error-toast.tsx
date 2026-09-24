import { useEffect, useState } from "react";
import { i18nKeyFor, type AppErrorSerialized } from "@/api/ipc";
import { t } from "@/i18n/t";

const AUTO_DISMISS_MS = 4_000;

export function ErrorToast({ error }: { error: AppErrorSerialized }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      onClick={() => setVisible(false)}
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-base text-text-primary shadow-md"
    >
      {t(i18nKeyFor(error))}
    </div>
  );
}
