import { useCallback, useEffect, useState } from "react";
import DesignPreview from "@/pages/DesignPreview";
import TitleBar from "@/components/TitleBar";
import Layout from "@/components/Layout";
import ViewTabs, { type ViewKind } from "@/components/ViewTabs";
import ListView from "@/views/ListView";
import BoardView from "@/views/BoardView";
import GanttView from "@/views/GanttView";
import CorruptedView from "@/views/CorruptedView";
import Settings from "@/views/Settings";
import { healthCheck, i18nKeyFor, type IpcResult } from "@/api/ipc";
import { t } from "@/i18n/t";

type Health = "loading" | "ok" | "corrupted" | "locked";

function App() {
  const [isPreview, setIsPreview] = useState(false);
  const [health, setHealth] = useState<Health>("loading");
  const [activeView, setActiveView] = useState<ViewKind>("list");
  const [route, setRoute] = useState<"views" | "settings">("views");
  const [lockError, setLockError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setHealth("loading");
    const result = await healthCheck();
    if (result.ok) {
      setHealth("ok");
    } else if (result.error.variant === "db_corrupted") {
      setHealth("corrupted");
    } else if (result.error.variant === "db_locked") {
      setHealth("locked");
      setLockError(t(i18nKeyFor(result.error)));
    } else {
      setHealth("locked");
      setLockError(t("error.unknown"));
    }
  }, []);

  useEffect(() => {
    setIsPreview(
      import.meta.env.DEV &&
        new URLSearchParams(window.location.search).get("preview") === "1",
    );
    void check();
  }, [check]);

  if (isPreview) {
    return <DesignPreview />;
  }

  if (health === "loading") {
    return (
      <main className="flex h-full items-center justify-center">
        <p className="text-text-subtle">Solo Task</p>
      </main>
    );
  }

  if (health === "corrupted") {
    return (
      <CorruptedView
        onOpenSettings={() => {
          setHealth("loading");
          // Settings 仍可进入 (S3: 允许用户主动放弃数据), 但保持 corrupted 状态标记
          setRoute("settings");
          setHealth("ok");
        }}
      />
    );
  }

  if (health === "locked") {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-6">
        <p className="text-text-muted">{lockError ?? t("error.db_locked")}</p>
        <button
          type="button"
          onClick={() => void check()}
          className="rounded-md bg-accent px-4 py-2 font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
        >
          {t("error.retry")}
        </button>
      </main>
    );
  }

  return (
    <>
      <TitleBar>
        <ViewTabs active={activeView} onChange={setActiveView} />
      </TitleBar>
      <Layout
        headerLeft={
          route === "settings" ? t("settings.title") : t(`views.${activeView}`)
        }
        onOpenSettings={
          route === "settings"
            ? null
            : route === "views"
              ? () => setRoute("settings")
              : undefined
        }
      >
        {route === "settings" ? (
          <Settings onBack={() => setRoute("views")} />
        ) : (
          <>
            {activeView === "list" && <ListView />}
            {activeView === "board" && <BoardView />}
            {activeView === "gantt" && <GanttView />}
          </>
        )}
      </Layout>
    </>
  );
}

export type { IpcResult };
export default App;
