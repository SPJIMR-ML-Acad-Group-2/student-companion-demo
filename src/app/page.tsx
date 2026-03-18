"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BuildingLibraryIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const router = useRouter();

  const handleLogin = async (id?: string) => {
    const loginId = id || identifier;
    if (!loginId.trim()) { setError("Please enter your Roll Number or Staff Email"); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      router.push(data.user.role === "programme_office" ? "/office" : "/student");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-10 bg-[var(--color-bg-primary)]">

      {/* Header: app icon + name + SPJIMR logo */}
      <div className="w-full max-w-md flex items-center gap-3 mb-8 pb-6 border-b border-[var(--color-border)]">
        <img src="/app-icon.svg" alt="Classroom Companion" className="w-12 h-12 shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Classroom Companion
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">Attendance &amp; Analytics</p>
        </div>
        <img src="/SPJIMR_Logo.png" alt="SPJIMR" className="h-10 w-auto object-contain shrink-0 opacity-80" />
      </div>

      <div className="w-full max-w-md">

        {/* Card */}
        <div className="rounded-2xl p-8 bg-[var(--color-bg-card)] border border-[var(--color-border)]">

          {/* Sign in heading */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Sign In</h2>
            <p className="text-sm mt-1 text-[var(--color-text-secondary)]">
              Enter your Roll Number or Staff Email to continue.
            </p>
          </div>

          {/* Input */}
          <div className="mb-4 space-y-1.5">
            <Label htmlFor="identifier" className="text-[var(--color-text-muted)] uppercase tracking-widest text-xs">
              Roll Number / Email
            </Label>
            <Input
              id="identifier"
              type="text"
              placeholder="e.g. PGP-25-001 or admin@spjimr.org"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              disabled={loading}
              className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:ring-[#531f75]"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={() => handleLogin()}
            disabled={loading}
            className="w-full text-white font-semibold"
            style={{ background: loading ? "#531f7599" : "#531f75" }}
          >
            {loading
              ? <><Spinner size={16} /> Signing in...</>
              : "Sign In →"
            }
          </Button>

          {/* Error */}
          {error && (
            <div className="mt-3 px-4 py-3 rounded-lg text-sm bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {/* Quick Login */}
          <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-center text-[var(--color-text-muted)]">
              Quick Demo Login
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: "Programme Office",         sub: "office@spjimr.org",  Icon: BuildingLibraryIcon, id: "office@spjimr.org" },
                { label: "Student — PGDM A (Fin)",   sub: "PGP-25-001",         Icon: AcademicCapIcon,     id: "PGP-25-001"        },
                { label: "Student — PGDM A (Mkt)",   sub: "PGP-25-004",         Icon: AcademicCapIcon,     id: "PGP-25-004"        },
                { label: "Student — PGDM B (IM)",    sub: "PGP-25-011",         Icon: AcademicCapIcon,     id: "PGP-25-011"        },
                { label: "Student — BM D (Fin)",     sub: "PGPBM-25-001",       Icon: AcademicCapIcon,     id: "PGPBM-25-001"      },
              ].map(({ label, sub, Icon, id }) => (
                <button
                  key={id}
                  onClick={() => handleLogin(id)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm text-left cursor-pointer transition-colors flex items-center gap-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[#531f75] hover:text-[var(--color-text-primary)]"
                >
                  <Icon className="w-4 h-4 shrink-0 text-[#531f75]" />
                  <span>
                    <span className="font-medium block">{label}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Theme toggle */}
        <div className="mt-4 flex justify-center">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
