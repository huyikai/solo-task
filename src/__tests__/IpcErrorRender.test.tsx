import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorToast } from "@/components/ui/error-toast";
import {
  i18nKeyFor,
  type AppErrorSerialized,
  type AppErrorVariant,
} from "@/api/ipc";

const ALL_VARIANTS: AppErrorVariant[] = [
  "db_locked",
  "db_corrupted",
  "task_not_found",
  "permission_denied",
  "io_error",
  "unknown",
];

describe("i18nKeyFor (S4)", () => {
  test("maps each AppErrorVariant to its i18n key", () => {
    const expected: Record<AppErrorVariant, string> = {
      db_locked: "error.db_locked",
      db_corrupted: "error.db_corrupted",
      task_not_found: "error.unknown",
      permission_denied: "error.permission_denied",
      io_error: "error.unknown",
      unknown: "error.unknown",
    };
    for (const variant of ALL_VARIANTS) {
      expect(i18nKeyFor({ variant } as AppErrorSerialized)).toBe(
        expected[variant],
      );
    }
  });
});

describe("ErrorToast rendering (S4)", () => {
  test.each([
    ["db_locked", "数据库被锁定"],
    ["db_corrupted", "数据库损坏"],
    ["permission_denied", "权限不足"],
    ["unknown", "操作失败, 请稍后重试"],
  ] as const)(
    "renders the localized message for variant=%s",
    (variant, expectedText) => {
      render(<ErrorToast error={{ variant, message: "internal stack leak" }} />);
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(expectedText);
      expect(alert).not.toHaveTextContent("internal stack leak");
    },
  );
});
