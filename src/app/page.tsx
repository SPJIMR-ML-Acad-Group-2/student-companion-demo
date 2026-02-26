"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (id?: string) => {
    const loginId = id || identifier;
    if (!loginId.trim()) { setError("Please enter your Roll Number or Staff Email"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
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
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📚</div>
          <h1>Classroom Companion</h1>
        </div>
        <p className="login-subtitle">
          Automated attendance tracking & analytics for SPJIMR.<br />
          Sign in with your Roll Number (e.g., PGP-25-001) or Staff Email.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="identifier">Roll Number / Email</label>
          <input id="identifier" className="form-input" type="text" placeholder="e.g. PGP-25-001 or admin@spjimr.org"
            value={identifier} onChange={e => setIdentifier(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()} disabled={loading} />
        </div>
        <button className="btn-primary" onClick={() => handleLogin()} disabled={loading}>
          {loading ? <span className="spinner" /> : "Sign In"}
        </button>
        {error && <p className="error-msg">{error}</p>}

        <div className="quick-login">
          <div className="quick-login-label">Quick Demo Login</div>
          <div className="quick-login-btns">
            <button className="quick-btn" onClick={() => handleLogin("office@spjimr.org")}>🏫 Programme Office</button>
            <button className="quick-btn" onClick={() => handleLogin("PGP-25-001")}>🎓 Student (PGDM A, Fin)</button>
            <button className="quick-btn" onClick={() => handleLogin("PGP-25-031")}>🎓 Student (PGDM A, Mkt)</button>
            <button className="quick-btn" onClick={() => handleLogin("PGP-25-090")}>🎓 Student (PGDM B, IM)</button>
            <button className="quick-btn" onClick={() => handleLogin("PGPBM-25-001")}>🎓 Student (BM D, Fin)</button>
          </div>
        </div>
      </div>
    </div>
  );
}
