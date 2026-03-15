"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const t = saved || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const isDark = theme === "dark";

  return (
    <Tooltip>
      {/* render as span to avoid nested <button> hydration error */}
      <TooltipTrigger render={<span className="w-full block" />}>
        <Button
          variant="outline"
          onClick={toggle}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-full justify-start gap-2 px-3 border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[#531f75] hover:bg-[var(--color-bg-card-hover)] transition-colors"
          style={{ height: "auto", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
        >
          {isDark
            ? <SunIcon className="w-4 h-4 shrink-0 text-[#f58220]" />
            : <MoonIcon className="w-4 h-4 shrink-0 text-[#531f75]" />
          }
          <span className="text-sm font-medium">
            {isDark ? "Light Mode" : "Dark Mode"}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </TooltipContent>
    </Tooltip>
  );
}
