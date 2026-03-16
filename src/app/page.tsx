"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BookOpenIcon, BuildingLibraryIcon, AcademicCapIcon } from "@heroicons/react/24/outline";
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
    <div className="flex items-center justify-center min-h-screen px-4 bg-[var(--color-bg-primary)]">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="rounded-2xl p-8 bg-[var(--color-bg-card)] border border-[var(--color-border)]">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="flex items-center justify-center mb-4 w-16 h-16 rounded-2xl"
              style={{ background: "linear-gradient(135deg, #531f75, #8b5cf6)" }}
            >
              <BookOpenIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)]">Classroom Companion</h1>
            <p className="text-sm text-center mt-2 text-[var(--color-text-secondary)]">
              Automated attendance tracking &amp; analytics for SPJIMR.<br />
              Sign in with your Roll Number or Staff Email.
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
            style={{ background: loading ? "#531f7599" : "linear-gradient(135deg, #531f75, #8b5cf6)" }}
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
