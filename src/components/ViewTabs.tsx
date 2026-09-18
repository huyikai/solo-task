import { cn } from "@/lib/utils";
import { t } from "@/i18n/t";

export type ViewKind = "list" | "board" | "gantt";

interface ViewTabsProps {
  active: ViewKind;
  onChange: (view: ViewKind) => void;
}

const tabs: Array<{ key: ViewKind; labelKey: string }> = [
  { key: "list", labelKey: "views.list" },
  { key: "board", labelKey: "views.board" },
  { key: "gantt", labelKey: "views.gantt" },
];

export function ViewTabs({ active, onChange }: ViewTabsProps) {
  return (
    <div role="tablist" className="flex gap-1">
      {tabs.map(({ key, labelKey }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors duration-150",
            active === key
              ? "bg-bg font-medium text-text-primary"
              : "text-text-muted hover:bg-bg hover:text-text-primary",
          )}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}

export default ViewTabs;
