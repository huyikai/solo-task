// 004-tray-and-window-controls (FR-007/008 / US3): Settings 外观分组新增
// "关闭按钮"二选一控件,沿用 §6.6 ThemeSwitcher 视觉语言
// (bg-bg + font-medium + shadow-sm 选中态)。

import * as React from "react";
import { cn } from "@/lib/utils";
import { getPreference, setPreference } from "@/api/ipc";
import { t } from "@/i18n/t";
import type { CloseAction } from "@/window/lifecycle";
import { parseCloseAction } from "@/window/lifecycle";

const KEY = "window.close_action";
const OPTIONS: CloseAction[] = ["minimize_to_tray", "quit"];

const LABEL_KEY: Record<CloseAction, string> = {
  minimize_to_tray: "settings.close_action.minimize_to_tray",
  quit: "settings.close_action.quit",
};

export function SettingsCloseAction() {
  const [value, setValue] = React.useState<CloseAction>("minimize_to_tray");

  React.useEffect(() => {
    void getPreference(KEY).then((result) => {
      if (result.ok) {
        setValue(parseCloseAction(result.data.value));
      }
    });
  }, []);

  async function handleChange(next: CloseAction) {
    setValue(next);
    await setPreference(KEY, JSON.stringify(next));
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("settings.close_action.label")}
      className="flex gap-1 rounded-md border border-border p-1"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => void handleChange(opt)}
            className={cn(
              "h-8 flex-1 rounded-md px-3 text-sm transition-colors duration-150",
              selected
                ? "bg-bg font-medium text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {t(LABEL_KEY[opt])}
          </button>
        );
      })}
    </div>
  );
}

export default SettingsCloseAction;