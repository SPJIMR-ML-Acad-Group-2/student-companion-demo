"use client";

import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/student",          icon: "📊", label: "Attendance" },
  { href: "/student/calendar", icon: "📅", label: "Calendar"   },
];

export default function StudentSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/");
  };

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-10 flex flex-col"
      style={{ width: 260, background: "var(--color-bg-secondary)", borderRight: "1px solid var(--color-border)", padding: "24px 16px" }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div
          className="flex items-center justify-center text-lg shrink-0"
          style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10 }}
        >📚</div>
        <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Companion</h2>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/student" && pathname.startsWith(href));
          return (
            <a
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors no-underline"
              style={{
                color:        active ? "var(--color-accent-sec)" : "var(--color-text-secondary)",
                background:   active ? "var(--color-accent-glow)" : "transparent",
                borderRadius: 6,
              }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--color-bg-card)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)"; }}}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent";           (e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"; }}}
            >
              <span className="text-lg w-6 text-center shrink-0">{icon}</span>
              {label}
            </a>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-2.5 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div
          className="flex items-center justify-center text-sm font-semibold text-white shrink-0"
          style={{ width: 36, height: 36, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: "50%" }}
        >{userName[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>{userName}</div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Student</div>
        </div>
        <button
          onClick={handleLogout}
          className="px-2.5 py-1.5 text-xs rounded cursor-pointer transition-colors shrink-0"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", fontFamily: "inherit" }}
        >↩</button>
      </div>
    </aside>
  );
}
