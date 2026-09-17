import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn-style Button — variants / sizes mirror the canonical shadcn
// component so that copy/pasting from shadcn-ui.com source lines up
// with our token names (we map shadcn's `bg-primary` -> `bg-accent`,
// `text-primary-foreground` -> `text-white`, etc. via tailwind.config).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-bg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white hover:bg-accent-hover",
        destructive:
          "bg-[var(--error)] text-white hover:brightness-90",
        outline:
          "border border-border-strong bg-surface hover:bg-bg hover:text-text-primary",
        secondary:
          "bg-surface text-text-primary border border-border-strong hover:bg-bg",
        ghost: "hover:bg-bg hover:text-text-primary",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
