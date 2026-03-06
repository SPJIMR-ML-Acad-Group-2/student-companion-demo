"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OfficeSidebar from "@/components/OfficeSidebar";
import { Spinner } from "@/components/ui/Spinner";

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
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg-primary)]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative z-[1] bg-[var(--color-bg-primary)]">
      <OfficeSidebar userName={userName} />
      <main className="flex-1" style={{ marginLeft: "260px", padding: "2rem 2.5rem" }}>
        {children}
      </main>
    </div>
  );
}
