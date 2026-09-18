import { t } from "@/i18n/t";
import { cn } from "@/lib/utils";

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
      className="inline-flex h-8 w-fit items-center overflow-hidden rounded-lg bg-muted p-[3px]"
    >
      {options.map(({ key, labelKey }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex h-[calc(100%-2px)] items-center rounded-md px-4 text-sm font-medium transition-all",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitcher;
