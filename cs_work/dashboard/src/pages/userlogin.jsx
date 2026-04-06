import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./userlogin.css";

const ROLES = [
  { value: "student", label: "Student",  icon: "🎒" },
  { value: "teacher", label: "Teacher",  icon: "📚" },
  { value: "admin",   label: "Admin",    icon: "🛡️" },
];

function UserLogin() {
  const [role,     setRole]     = useState("student");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        if (data.role === "student")      window.location.href = "/dashboard";
        else if (data.role === "teacher") window.location.href = "/teacher";
        else if (data.role === "admin")   window.location.href = "/admin";
      } else {
        setError(data.message || "Login failed.");
      }
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left panel — branding */}
      <div className="login-brand">
        <div className="brand-content">
          <span className="brand-icon">🎓</span>
          <h1 className="brand-title">Clearance<br />System</h1>
          <p className="brand-desc">
            Manage your academic clearance quickly and transparently.
          </p>
        </div>
        <div className="brand-circles">
          <div className="bc bc1" />
          <div className="bc bc2" />
          <div className="bc bc3" />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-form-panel">
        <div className="login-card">
          <h2 className="lc-title">Welcome Back</h2>
          <p className="lc-sub">Sign in to your account</p>

          {/* Role selector */}
          <div className="role-tabs">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`role-tab ${role === r.value ? "active" : ""}`}
                onClick={() => { setRole(r.value); setError(""); }}
              >
                <span className="role-tab-icon">{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="lc-form">
            <div className="lc-field">
              <label className="lc-label">Email Address</label>
              <input
                required
                type="email"
                className="lc-input"
                placeholder="you@school.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="lc-field">
              <label className="lc-label">Password</label>
              <input
                required
                type="password"
                className="lc-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="lc-error">⚠ {error}</p>}

            <button type="submit" className="lc-btn" disabled={loading}>
              {loading ? "Signing in…" : `Sign in as ${ROLES.find(r => r.value === role)?.label}`}
            </button>
          </form>

          {role === "student" && (
            <p className="lc-footer">
              No account yet? <Link to="/register">Register here</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserLogin;