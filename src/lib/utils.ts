// Minimal cn() — shadcn-style utility.
// Combines clsx + tailwind-merge to deduplicate / resolve conflicting
// Tailwind classes.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
