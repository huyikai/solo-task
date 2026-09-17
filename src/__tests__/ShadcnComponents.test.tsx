import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

describe("shadcn-style Button (S6)", () => {
  test("renders with default variant and forwards onClick", async () => {
    const user = userEvent.setup();
    render(<Button onClick={() => undefined}>click me</Button>);
    const btn = screen.getByRole("button", { name: "click me" });
    await user.click(btn);
    expect(btn).toBeInTheDocument();
  });

  test("supports variant=destructive", () => {
    render(<Button variant="destructive">危险操作</Button>);
    const btn = screen.getByRole("button", { name: "危险操作" });
    expect(btn.className).toMatch(/error/);
  });

  test("supports variant=outline", () => {
    render(<Button variant="outline">次要操作</Button>);
    const btn = screen.getByRole("button", { name: "次要操作" });
    expect(btn.className).toMatch(/border/);
  });

  test("supports variant=ghost", () => {
    render(<Button variant="ghost">幽灵</Button>);
    const btn = screen.getByRole("button", { name: "幽灵" });
    expect(btn).toBeInTheDocument();
  });

  test("size=sm renders smaller height", () => {
    render(<Button size="sm">小</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-8");
  });
});

describe("shadcn-style Card (S6)", () => {
  test("renders header / title / content", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>卡片标题</CardTitle>
        </CardHeader>
        <CardContent>内容</CardContent>
      </Card>,
    );
    expect(screen.getByText("卡片标题")).toBeInTheDocument();
    expect(screen.getByText("内容")).toBeInTheDocument();
  });
});
