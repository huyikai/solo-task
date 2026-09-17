import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { t } from "@/i18n/t";

describe("i18n lookup", () => {
  beforeEach(() => {
    vi.stubEnv("DEV", true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("returns translation for known key", () => {
    expect(t("app.title")).toBe("Solo Task");
    expect(t("views.list")).toBe("列表");
    expect(t("views.board")).toBe("看板");
    expect(t("views.gantt")).toBe("甘特图");
  });

  test("returns missing marker for unknown key", () => {
    expect(t("missing.key")).toBe("<missing:missing.key>");
  });

  test("warns in dev mode for unknown key", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    t("missing.key");
    expect(spy).toHaveBeenCalledWith("[i18n] missing key: missing.key");
  });

  test("interpolates variables", () => {
    const result = t("settings.theme.currentHint", { mode: "暗色" });
    expect(result).toBe("跟随系统 (当前: 暗色)");
  });
});
