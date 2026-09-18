import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import DesignPreview from "@/pages/DesignPreview";
import TitleBar from "@/components/TitleBar";
import Layout from "@/components/Layout";
import ListView from "@/views/ListView";
import BoardView from "@/views/BoardView";
import GanttView from "@/views/GanttView";
import CorruptedView from "@/views/CorruptedView";
import Settings from "@/views/Settings";
import { healthCheck, i18nKeyFor, type IpcResult } from "@/api/ipc";
import { t } from "@/i18n/t";

type ViewKind = "list" | "board" | "gantt";
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
        <Button onClick={() => void check()}>{t("error.retry")}</Button>
      </main>
    );
  }

  return (
    <>
      <TitleBar />
      <Layout
        onOpenSettings={null}
        className="pt-0"
      >
        {route === "settings" ? (
          <Settings onBack={() => setRoute("views")} />
        ) : (
          <Tabs
            value={activeView}
            onValueChange={(v) => setActiveView(v as ViewKind)}
            orientation="horizontal"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="list">{t("views.list")}</TabsTrigger>
                <TabsTrigger value="board">{t("views.board")}</TabsTrigger>
                <TabsTrigger value="gantt">{t("views.gantt")}</TabsTrigger>
              </TabsList>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setRoute("settings")}
                aria-label={t("settings.title")}
                className="text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </Button>
            </div>
            <TabsContent value="list">
              <ListView />
            </TabsContent>
            <TabsContent value="board">
              <BoardView />
            </TabsContent>
            <TabsContent value="gantt">
              <GanttView />
            </TabsContent>
          </Tabs>
        )}
      </Layout>
    </>
  );
}

export type { IpcResult };
export default App;
