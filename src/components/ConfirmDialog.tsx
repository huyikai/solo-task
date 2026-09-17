import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { t } from "@/i18n/t";

interface ConfirmDialogProps {
  open: boolean;
  expectedText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  expectedText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  if (!open) return null;

  const canConfirm = value === expectedText;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "color-mix(in srgb, var(--bg) 50%, transparent)" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[480px] rounded-lg border border-border bg-surface p-6 shadow-lg">
        <h2 className="text-xl font-semibold">{t("settings.confirm_clear_title")}</h2>
        <p className="mt-2 text-base text-text-muted">
          {t("settings.confirm_clear_message")}
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("settings.confirm_clear_placeholder")}
          className="mt-4 h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-base outline-none focus:border-accent"
          data-testid="confirm-input"
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {t("settings.cancel")}
          </Button>
          <Button variant="danger" disabled={!canConfirm} onClick={onConfirm}>
            {t("settings.confirm_clear_button")}
          </Button>
        </div>
      </div>
    </div>
  );
}
