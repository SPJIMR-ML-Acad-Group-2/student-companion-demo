"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const C = {
  bg:      "var(--color-bg-primary)",
  card:    "var(--color-bg-card)",
  sec:     "var(--color-bg-secondary)",
  border:  "var(--color-border)",
  text:    "var(--color-text-primary)",
  muted:   "var(--color-text-muted)",
  sub:     "var(--color-text-secondary)",
  accent:  "var(--color-accent)",
  accentS: "var(--color-accent-sec)",
  accentG: "var(--color-accent-glow)",
  danger:  "var(--color-danger)",
  dangerB: "var(--color-danger-bg)",
};

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
    <div className="flex items-center justify-center min-h-screen px-4" style={{ background: C.bg }}>
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: C.card, border: `1px solid ${C.border}` }}>

          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div
              className="flex items-center justify-center text-3xl mb-4"
              style={{ width: 64, height: 64, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 16 }}
            >
              📚
            </div>
            <h1 className="text-2xl font-bold text-center" style={{ color: C.text }}>Classroom Companion</h1>
            <p className="text-sm text-center mt-2" style={{ color: C.sub }}>
              Automated attendance tracking &amp; analytics for SPJIMR.<br />
              Sign in with your Roll Number or Staff Email.
            </p>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" htmlFor="identifier" style={{ color: C.muted }}>
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
            className="w-full py-3 rounded-lg font-semibold text-sm text-white cursor-pointer transition-opacity flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#6366f1,#7c3aed)", border: "none", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? <><div className="rounded-full border-2 animate-spin shrink-0" style={{ width: 16, height: 16, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} /> Signing in…</>
              : "Sign In →"
            }
          </button>

          {/* Error */}
          {error && (
            <div className="mt-3 px-4 py-3 rounded-lg text-sm" style={{ background: C.dangerB, color: C.danger }}>
              {error}
            </div>
          )}

          {/* Quick Login */}
          <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${C.border}` }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-center" style={{ color: C.muted }}>
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
                  className="w-full px-4 py-2.5 rounded-lg text-sm text-left cursor-pointer transition-colors"
                  style={{ background: C.sec, border: `1px solid ${C.border}`, color: C.sub, fontFamily: "inherit" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.accent; (e.currentTarget as HTMLElement).style.color = C.text; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.color = C.sub; }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
