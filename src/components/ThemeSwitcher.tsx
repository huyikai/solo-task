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

export default function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  return (
    <div role="radiogroup" aria-label={t("settings.theme")} className="inline-flex overflow-hidden rounded-md border border-border">
      {options.map(({ key, labelKey }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(key)}
            className={`h-9 px-3 text-sm transition-colors duration-150 ${
              selected
                ? "bg-bg font-medium text-text-primary"
                : "bg-surface text-text-muted hover:text-text-primary"
            }`}
            style={
              selected
                ? { boxShadow: "inset 0 0 0 2px var(--accent)" }
                : undefined
            }
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}
