import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/t";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeSwitcherProps {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

const options: Array<{ key: ThemeMode; labelKey: string }> = [
  { key: "system", labelKey: "settings.theme.system" },
  { key: "light", labelKey: "settings.theme.light" },
  { key: "dark", labelKey: "settings.theme.dark" },
];

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  return (
    <div
      role="radiogroup"
      aria-label={t("settings.theme")}
      className="inline-flex overflow-hidden rounded-md border border-border"
    >
      {options.map(({ key, labelKey }) => {
        const selected = value === key;
        return (
          <Button
            key={key}
            type="button"
            variant="ghost"
            size="sm"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              "h-9 rounded-md px-3 text-sm",
              selected
                ? "bg-bg font-medium text-text-primary"
                : "bg-surface text-text-muted hover:text-text-primary",
            )}
          >
            {t(labelKey)}
          </Button>
        );
      })}
    </div>
  );
}

export default ThemeSwitcher;
