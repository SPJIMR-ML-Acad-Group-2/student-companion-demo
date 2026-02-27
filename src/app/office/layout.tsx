"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OfficeSidebar from "@/components/OfficeSidebar";

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-bg-primary)" }}>
        <div
          className="rounded-full border-2 border-t-white animate-spin"
          style={{ width: 40, height: 40, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative z-[1]" style={{ background: "var(--color-bg-primary)" }}>
      <OfficeSidebar userName={userName} />
      <main className="flex-1" style={{ marginLeft: 260, padding: "32px 40px" }}>
        {children}
      </main>
    </div>
  );
}
