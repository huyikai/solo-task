"use client";

import * as React from "react";
import { Tabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

// shadcn-style Tabs (Base UI edition per ui.shadcn.com/docs/components/base/tabs).
// Tabs.Root = group container with onValueChange / defaultValue.
// Tabs.List = tab strip.
// Tabs.Tab = individual trigger button.
// Tabs.Panel = content panel.

const TabsRoot = Tabs.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof Tabs.List>,
  React.ComponentPropsWithoutRef<typeof Tabs.List>
>(({ className, ...props }, ref) => (
  <Tabs.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center gap-1 rounded-md text-text-muted",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof Tabs.Tab>,
  React.ComponentPropsWithoutRef<typeof Tabs.Tab>
>(({ className, ...props }, ref) => (
  <Tabs.Tab
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
      "transition-colors duration-150",
      "hover:bg-bg hover:text-text-primary",
      "data-[selected]:bg-bg data-[selected]:text-text-primary data-[selected]:font-medium",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsPanel = React.forwardRef<
  React.ElementRef<typeof Tabs.Panel>,
  React.ComponentPropsWithoutRef<typeof Tabs.Panel>
>(({ className, ...props }, ref) => (
  <Tabs.Panel
    ref={ref}
    className={cn("focus-visible:outline-none", className)}
    {...props}
  />
));
TabsPanel.displayName = "TabsPanel";

// Compatibility aliases (some users prefer Content naming)
const TabsContent = TabsPanel;

export { TabsRoot as Tabs, TabsList, TabsTrigger, TabsPanel, TabsContent };
