"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OfficeSidebar from "@/components/OfficeSidebar";
import { Spinner } from "@/components/ui/spinner";
import { Bars3Icon, BookOpenIcon } from "@heroicons/react/24/outline";

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) { router.push("/"); return; }
      const { user } = await res.json();
      if (user?.role !== "programme_office") { router.push("/"); return; }
      setUserName(user.name);
    });
  }, [router]);

  if (!userName) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg-primary)]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative z-[1] bg-[var(--color-bg-primary)]">
      <OfficeSidebar userName={userName} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center h-14 px-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-[var(--color-bg-card)] transition-colors">
          <Bars3Icon className="w-6 h-6 text-[var(--color-text-primary)]" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="flex items-center justify-center shrink-0 w-7 h-7 rounded-lg" style={{ background: "linear-gradient(135deg, #531f75, #8b5cf6)" }}>
            <BookOpenIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Classroom Companion</span>
        </div>
      </div>

      <main className="flex-1 md:ml-[260px] px-4 py-4 pt-16 md:px-10 md:py-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
