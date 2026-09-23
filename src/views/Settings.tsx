import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorToast } from "@/components/ui/error-toast";
import { ThemeSwitcher, type ThemeMode } from "@/components/ThemeSwitcher";
import { SettingsCloseAction } from "@/components/SettingsCloseAction";
import {
  getPreference,
  setPreference,
  triggerTestError,
  type AppErrorSerialized,
  type TestErrorVariant,
} from "@/api/ipc";
import { t } from "@/i18n/t";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
}

export default function Settings({ onBack }: { onBack?: () => void } = {}) {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [systemDark, setSystemDark] = useState(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [checking, setChecking] = useState(false);
  const [noUpdate, setNoUpdate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [testError, setTestError] = useState<AppErrorSerialized | null>(null);

  useEffect(() => {
    void getPreference("theme.mode").then((result) => {
      if (result.ok) {
        try {
          const parsed = JSON.parse(result.data.value) as ThemeMode;
          if (parsed === "system" || parsed === "light" || parsed === "dark") {
            setTheme(parsed);
            applyTheme(parsed);
          }
        } catch {
          // 保持默认 system
        }
      }
    });
  }, []);

  const handleThemeChange = useCallback(async (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
    await setPreference("theme.mode", JSON.stringify(mode));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function handleCheckUpdate() {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setNoUpdate(true);
    }, 1000);
  }

  const resolvedKey = (() => {
    const actual = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    return actual === "dark" ? "settings.theme.dark" : "settings.theme.light";
  })();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 pb-8 pt-16">
      {onBack && (
        <Button
          variant="outline"
          size="lg"
          className="fixed left-6 top-14 z-40 px-5"
          onClick={onBack}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          {t("views.list")}
        </Button>
      )}
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("settings.appearance")}</h2>
        <Card>
          <CardContent className="flex items-center justify-between pt-4">
            <span className="text-base">{t("settings.theme")}</span>
            <div className="flex flex-col items-end gap-1">
              <ThemeSwitcher value={theme} onChange={(m) => void handleThemeChange(m)} />
              <span className="text-xs text-text-muted">
                {t("settings.theme.currentHint", { mode: t(resolvedKey) })}
              </span>
            </div>
          </CardContent>
        </Card>
        {/* 004 US3 / FR-007: appearance section adds the close-action
            switch; same visual language as Theme (segmented radiogroup
            per design.md §6.6). */}
        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-4">
            <span className="text-base shrink-0">{t("settings.close_action.label")}</span>
            <SettingsCloseAction />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("settings.data")}</h2>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-base">{t("settings.check_for_update")}</span>
              <div className="flex items-center gap-2">
                {noUpdate && (
                  <span className="text-sm text-text-muted">
                    {t("settings.no_update")}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={checking}
                  onClick={handleCheckUpdate}
                >
                  {checking ? t("settings.checking") : t("settings.check_for_update")}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base">{t("settings.clear_data")}</span>
              <div className="flex items-center gap-2">
                {cleared && (
                  <span className="text-sm text-text-muted">
                    {t("settings.clear_done")}
                  </span>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                >
                  {t("settings.clear_data")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("settings.about")}</h2>
        <Card>
          <CardContent className="flex items-center justify-between pt-4">
            <span className="text-base">{t("settings.version")}</span>
            <span className="font-mono text-sm text-text-muted">v0.1.0</span>
          </CardContent>
        </Card>
      </section>

      {import.meta.env.DEV && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t("settings.developer")}</h2>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 pt-4">
              {(["db_locked", "db_corrupted", "permission_denied", "unknown"] as TestErrorVariant[]).map(
                (variant) => (
                  <Button
                    key={variant}
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const result = await triggerTestError(variant);
                      if (!result.ok) setTestError(result.error);
                    }}
                  >
                    {variant}
                  </Button>
                ),
              )}
            </CardContent>
          </Card>
          {testError && <ErrorToast error={testError} />}
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        expectedText={t("settings.confirm_clear_placeholder")}
        title={t("settings.confirm_clear_title")}
        message={t("settings.confirm_clear_message")}
        confirmLabel={t("settings.confirm_clear_button")}
        cancelLabel={t("settings.cancel")}
        onConfirm={() => {
          setConfirmOpen(false);
          setCleared(true);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
