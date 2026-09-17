export type ViewKind = "list" | "board" | "gantt";

import { t } from "@/i18n/t";

interface ViewTabsProps {
  active: ViewKind;
  onChange: (view: ViewKind) => void;
}

const tabs: Array<{ key: ViewKind; labelKey: string }> = [
  { key: "list", labelKey: "views.list" },
  { key: "board", labelKey: "views.board" },
  { key: "gantt", labelKey: "views.gantt" },
];

export default function ViewTabs({ active, onChange }: ViewTabsProps) {
  return (
    <div role="tablist" className="flex gap-4 border-b border-border px-6">
      {tabs.map(({ key, labelKey }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className={`-mb-px border-b-2 px-4 py-2 text-base transition-colors duration-150 ${
            active === key
              ? "border-accent font-medium text-text-primary"
              : "border-transparent text-text-muted hover:text-text-primary"
          }`}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
