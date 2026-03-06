"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    setTheme(saved || "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 w-full px-3 py-2 rounded text-sm font-medium transition-colors cursor-pointer bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
      aria-label="Toggle theme"
    >
      <span className="text-lg w-6 text-center shrink-0">{theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}</span>
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
