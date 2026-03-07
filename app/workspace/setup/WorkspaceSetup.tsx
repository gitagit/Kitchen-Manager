"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function WorkspaceSetup() {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("My Kitchen");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();

  // Pre-fill code from URL if user came via /join?code=xxx
  useState(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode);
      setTab("join");
    }
  });

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create workspace");
      return;
    }
    await update();
    router.push("/onboard");
  }

  async function joinWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/workspace/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to join workspace");
      return;
    }
    await update();
    router.push("/welcome");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setTab("create")}
          style={{
            flex: 1,
            background: tab === "create" ? "rgba(74,144,217,0.15)" : "none",
            border: "1px solid rgba(74,144,217,0.3)",
            opacity: tab === "create" ? 1 : 0.5,
          }}
        >
          Create new
        </button>
        <button
          onClick={() => setTab("join")}
          style={{
            flex: 1,
            background: tab === "join" ? "rgba(74,144,217,0.15)" : "none",
            border: "1px solid rgba(74,144,217,0.3)",
            opacity: tab === "join" ? 1 : 0.5,
          }}
        >
          Join with code
        </button>
      </div>

      {tab === "create" ? (
        <form onSubmit={createWorkspace} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 13, opacity: 0.7 }}>Workspace name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Kitchen"
            required
            autoFocus
            style={{ fontSize: 16 }}
          />
          <small className="muted">
            You can invite household members later from Preferences.
          </small>
          {error && <p style={{ color: "var(--danger)", margin: 0 }}><small>{error}</small></p>}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{ background: "rgba(74,144,217,0.15)", border: "1px solid rgba(74,144,217,0.4)" }}
          >
            {loading ? "Creating..." : "Create workspace"}
          </button>
        </form>
      ) : (
        <form onSubmit={joinWorkspace} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 13, opacity: 0.7 }}>Invite code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste invite code here"
            required
            autoFocus
            style={{ fontSize: 16 }}
          />
          {error && <p style={{ color: "var(--danger)", margin: 0 }}><small>{error}</small></p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            style={{ background: "rgba(74,144,217,0.15)", border: "1px solid rgba(74,144,217,0.4)" }}
          >
            {loading ? "Joining..." : "Join workspace"}
          </button>
        </form>
      )}
    </div>
  );
}
