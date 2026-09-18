import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// shadcn-style Card-based dialog. Replaces old ConfirmDialog.
// NOTE: Uses native <dialog> element when available (via open prop)
// so we get focus trap + ESC handling from the platform. We render
// inline + manual focus for now to keep one component without
// pulling in @radix-ui/react-dialog yet.

interface ConfirmDialogProps {
  open: boolean;
  expectedText: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  expectedText,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel,
  cancelLabel,
}: ConfirmDialogProps) {
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    if (open) setValue("");
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const canConfirm = value === expectedText;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "color-mix(in srgb, var(--bg) 50%, transparent)" }}
      onClick={onCancel}
    >
      <div
        className={cn(
          "w-[480px] max-w-[90vw] rounded-lg border border-border bg-surface p-6 shadow-lg",
          "flex flex-col gap-4",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-xl font-semibold">{title}</h2>}
        {message && (
          <p className="text-base text-text-muted">{message}</p>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={expectedText}
          autoFocus
          data-testid="confirm-input"
          className={cn(
            "h-10 w-full rounded-md border border-border-strong bg-bg px-3 text-base",
            "outline-none transition-colors duration-150",
            "focus:border-accent",
          )}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel ?? "Cancel"}
          </Button>
          <Button variant="destructive" disabled={!canConfirm} onClick={onConfirm}>
            {confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
