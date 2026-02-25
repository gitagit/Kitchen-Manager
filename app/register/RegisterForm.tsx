"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterForm({ hasGoogle, hasGithub }: { hasGoogle: boolean; hasGithub: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, name: name.trim() || undefined }),
    });

    if (!res.ok) {
      const data = await res.json();
      const msg = typeof data.error === "string" ? data.error : "Registration failed";
      setError(msg);
      setLoading(false);
      return;
    }

    // Auto sign in after registration
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Registered but couldn't sign in — please sign in manually");
      router.push("/login");
    } else {
      router.push("/workspace/setup");
      router.refresh();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        type="text"
        placeholder="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        style={{ fontSize: 16 }}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ fontSize: 16 }}
      />
      <input
        type="password"
        placeholder="Password (8+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        style={{ fontSize: 16 }}
      />
      {error && (
        <p style={{ color: "var(--danger)", margin: 0 }}>
          <small>{error}</small>
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        style={{
          background: "rgba(74,144,217,0.15)",
          border: "1px solid rgba(74,144,217,0.4)",
        }}
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
      <p style={{ textAlign: "center", margin: "4px 0 0" }}>
        <small className="muted">
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </small>
      </p>
    </form>

    {(hasGoogle || hasGithub) && (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(127,127,127,0.2)" }} />
          <small className="muted">or</small>
          <div style={{ flex: 1, height: 1, background: "rgba(127,127,127,0.2)" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {hasGoogle && (
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              style={{ background: "none", border: "1px solid rgba(127,127,127,0.3)" }}
            >
              Continue with Google
            </button>
          )}
          {hasGithub && (
            <button
              onClick={() => signIn("github", { callbackUrl: "/" })}
              style={{ background: "none", border: "1px solid rgba(127,127,127,0.3)" }}
            >
              Continue with GitHub
            </button>
          )}
        </div>
      </>
    )}
    </div>
  );
}
