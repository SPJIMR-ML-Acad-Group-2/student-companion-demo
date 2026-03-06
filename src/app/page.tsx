"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { ThemeToggle } from "@/components/ThemeToggle";

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
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center justify-center text-3xl mb-4 w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500">
              📚
            </div>
            <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)]">Classroom Companion</h1>
            <p className="text-sm text-center mt-2 text-[var(--color-text-secondary)]">
              Automated attendance tracking &amp; analytics for SPJIMR.<br />
              Sign in with your Roll Number or Staff Email.
            </p>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2 text-[var(--color-text-muted)]" htmlFor="identifier">
              Roll Number / Email
            </label>
            <input
              id="identifier"
              type="text"
              className="tw-input"
              placeholder="e.g. PGP-25-001 or admin@spjimr.org"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <button
            onClick={() => handleLogin()}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-sm text-white cursor-pointer transition-opacity flex items-center justify-center gap-2 border-none bg-linear-to-br from-indigo-500 to-violet-600 ${loading ? "opacity-70" : ""}`}
          >
            {loading
              ? <><Spinner size={16} /> Signing in...</>
              : "Sign In \u2192"
            }
          </button>

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
                { label: "🏫 Programme Office",       id: "office@spjimr.org" },
                { label: "🎓 Student — PGDM A (Fin)", id: "PGP-25-001"        },
                { label: "🎓 Student — PGDM A (Mkt)", id: "PGP-25-004"        },
                { label: "🎓 Student — PGDM B (IM)",  id: "PGP-25-011"        },
                { label: "🎓 Student — BM D (Fin)",   id: "PGPBM-25-001"      },
              ].map(({ label, id }) => (
                <button
                  key={id}
                  onClick={() => handleLogin(id)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm text-left cursor-pointer transition-colors bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text-primary)]"
                >
                  {label}
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
