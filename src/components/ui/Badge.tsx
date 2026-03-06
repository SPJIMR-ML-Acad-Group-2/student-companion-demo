import React from "react";

interface BadgeProps {
  variant: "success" | "warning" | "danger";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return <span className={`badge-${variant} ${className}`}>{children}</span>;
}
