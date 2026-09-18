import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import ThemeSwitcher from "@/components/ThemeSwitcher";

describe("ThemeSwitcher (S6)", () => {
  test("renders 3 options with system checked by default", () => {
    render(<ThemeSwitcher value="system" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "跟随系统" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "亮色" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("radio", { name: "暗色" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("clicking dark calls onChange with dark", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThemeSwitcher value="system" onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "暗色" }));
    expect(onChange).toHaveBeenCalledWith("dark");
  });
});

describe("ConfirmDialog (S2)", () => {
  test("confirm disabled until expected text typed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        expectedText="DELETE"
        confirmLabel="确认清除"
        cancelLabel="取消"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const confirmBtn = screen.getByRole("button", { name: "确认清除" });
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByTestId("confirm-input");
    await user.type(input, "delete");
    expect(confirmBtn).toBeDisabled();

    await user.clear(input);
    await user.type(input, "DELETE");
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  test("cancel closes without confirming", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        expectedText="DELETE"
        confirmLabel="确认清除"
        cancelLabel="取消"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
