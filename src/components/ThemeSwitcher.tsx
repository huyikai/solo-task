import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as ThemeMode)}
      aria-label={t("settings.theme")}
      className="inline-flex h-10 w-fit items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground"
    >
      {options.map(({ key, labelKey }) => (
        <label
          key={key}
          className="cursor-pointer"
        >
          <RadioGroupItem value={key} className="peer sr-only" />
          <span className="inline-flex h-[calc(100%-2px)] items-center rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground peer-data-[state=checked]:bg-background peer-data-[state=checked]:text-foreground peer-data-[state=checked]:shadow-sm">
            {t(labelKey)}
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}

export default ThemeSwitcher;
