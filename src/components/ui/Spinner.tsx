import React from "react";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 40, className = "" }: SpinnerProps) {
  return (
    <div
      className={`rounded-full border-2 animate-spin border-[var(--color-spinner-border)] border-t-[var(--color-accent)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
