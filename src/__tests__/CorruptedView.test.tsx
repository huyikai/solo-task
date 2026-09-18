import { describe, expect, test, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CorruptedView from "@/views/CorruptedView";
import * as ipc from "@/api/ipc";

vi.mock("@/api/ipc", () => ({
  exportJson: vi.fn(),
}));

const mockedExportJson = vi.mocked(ipc.exportJson);

describe("CorruptedView (S3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows corrupted title and export button", () => {
    render(<CorruptedView />);
    expect(screen.getByText("数据库损坏")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出为 JSON" })).toBeInTheDocument();
  });

  test("clicking export invokes exportJson with the saved path", async () => {
    const user = userEvent.setup();
    // CorruptedView dynamically imports @tauri-apps/plugin-dialog's save()
    vi.doMock("@tauri-apps/plugin-dialog", () => ({
      save: vi.fn().mockResolvedValue("/tmp/export.json"),
    }));

    mockedExportJson.mockResolvedValue({
      ok: true,
      data: { written_to: "/tmp/export.json", bytes: 0, warnings: ["database_corrupted"] },
    });

    render(<CorruptedView />);
    await user.click(screen.getByRole("button", { name: "导出为 JSON" }));

    expect(mockedExportJson).toHaveBeenCalledWith("/tmp/export.json");
    expect(await screen.findByText("导出成功")).toBeInTheDocument();

    vi.doUnmock("@tauri-apps/plugin-dialog");
  });
});
