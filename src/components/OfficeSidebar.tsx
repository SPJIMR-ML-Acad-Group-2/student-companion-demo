"use client";

import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import {
  ChartBarSquareIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon,
  BookOpenIcon,
  ArrowLeftStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

interface Props {
  userName: string;
}

const NAV = [
  { href: "/office",            Icon: ChartBarSquareIcon,           label: "Dashboard"  },
  { href: "/office/manage",     Icon: Cog6ToothIcon,                label: "Manage"     },
  { href: "/office/attendance", Icon: ClipboardDocumentCheckIcon,   label: "Attendance" },
];

export default function OfficeSidebar({ userName }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

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
          className="flex items-center justify-center shrink-0 w-9 h-9 rounded-xl"
          style={{ background: "linear-gradient(135deg, #531f75, #8b5cf6)" }}
        >
          <BookOpenIcon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">
          Classroom<br />
          <span className="font-normal text-[var(--color-text-muted)]">Companion</span>
        </h2>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map(({ href, Icon, label }) => {
          const active =
            pathname === href ||
            (href !== "/office" && pathname.startsWith(href));
          return (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                active
                  ? "text-white bg-[#531f75]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: "18px", height: "18px" }} />
              {label}
            </a>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="mb-4">
        <ThemeToggle />
      </div>

      {/* User footer */}
      <div className="flex items-center gap-2.5 pt-4 border-t border-[var(--color-border)]">
        <div
          className="flex items-center justify-center text-sm font-bold text-white shrink-0 w-9 h-9 rounded-full"
          style={{ background: "linear-gradient(135deg, #531f75, #8b5cf6)" }}
        >
          {userName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate text-[var(--color-text-primary)]">
            {userName}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
            Programme Office
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-1.5 rounded-lg cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
        >
          <ArrowLeftStartOnRectangleIcon style={{ width: "16px", height: "16px" }} />
        </button>
      </div>
    </aside>
  );
}
