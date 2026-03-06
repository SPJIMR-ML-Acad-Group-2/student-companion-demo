"use client";

import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  userName: string;
}

const NAV = [
  { href: "/office", icon: "📊", label: "Dashboard" },
  { href: "/office/manage", icon: "⚙️", label: "Manage" },
  { href: "/office/attendance", icon: "✅", label: "Attendance" },
];

export default function OfficeSidebar({ userName }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/");
  };

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-10 flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] px-4 py-6"
      style={{ width: "260px" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div
          className="flex items-center justify-center text-lg shrink-0 w-9 h-9 rounded-[10px]"
          style={{ background: "linear-gradient(135deg, #531f75, #8b5cf6)" }}
        >
          📚
        </div>
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">
          Classroom Companion
        </h2>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ href, icon, label }) => {
          const active =
            pathname === href ||
            (href !== "/office" && pathname.startsWith(href));
          return (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-medium transition-colors no-underline ${
                active
                  ? "text-[var(--color-accent-sec)] bg-[var(--color-accent-glow)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span className="text-lg w-6 text-center shrink-0">{icon}</span>
              {label}
            </a>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="mb-4">
        <ThemeToggle />
      </div>

      {/* User */}
      <div className="flex items-center gap-2.5 pt-4 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-center text-sm font-semibold text-white shrink-0 w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-violet-500">
          {userName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate text-[var(--color-text-primary)]">
            {userName}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">
            Programme Office
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-2.5 py-1.5 text-xs rounded cursor-pointer transition-colors shrink-0 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent)]"
        >
          ↩
        </button>
      </div>
    </aside>
  );
}
