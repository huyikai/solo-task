import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

describe("shadcn-style Tabs", () => {
  test("renders triggers and shows default panel", () => {
    render(
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">列表</TabsTrigger>
          <TabsTrigger value="board">看板</TabsTrigger>
        </TabsList>
        <TabsContent value="list">列表内容</TabsContent>
        <TabsContent value="board">看板内容</TabsContent>
      </Tabs>,
    );
    expect(screen.getByText("列表内容")).toBeVisible();
    expect(screen.getByRole("tab", { name: "列表" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "看板" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("clicking a trigger switches the visible panel", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs defaultValue="list" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="list">列表</TabsTrigger>
          <TabsTrigger value="board">看板</TabsTrigger>
        </TabsList>
        <TabsContent value="list">列表内容</TabsContent>
        <TabsContent value="board">看板内容</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", { name: "看板" }));
    expect(screen.getByText("看板内容")).toBeVisible();
    expect(onValueChange).toHaveBeenCalled();
    const lastCall = onValueChange.mock.calls[onValueChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe("board");
  });
});
