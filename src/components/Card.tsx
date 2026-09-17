import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  hoverable?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function Card({
  title,
  subtitle,
  hoverable = false,
  className = "",
  children,
}: CardProps) {
  return (
    <div
      className={`rounded-md border border-border bg-surface p-4 shadow-sm ${
        hoverable ? "transition-shadow duration-150 hover:shadow-md" : ""
      } ${className}`}
    >
      {title && <h3 className="text-lg font-medium">{title}</h3>}
      {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
      {(title || subtitle) && <div className="mt-3 flex flex-col gap-3">{children}</div>}
      {!(title || subtitle) && children}
    </div>
  );
}
