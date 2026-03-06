import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: string;
}

export function Card({ className = "", padding = "p-6", children, ...props }: CardProps) {
  return (
    <div className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] ${padding} ${className}`} {...props}>
      {children}
    </div>
  );
}
