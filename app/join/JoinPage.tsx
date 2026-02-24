"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function JoinPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const router = useRouter();
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  // Redirect to login if not authenticated, preserving the code
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?from=/join?code=${encodeURIComponent(code)}`);
    }
  }, [status, code, router]);

  // If already in a workspace, go home
  useEffect(() => {
    if (session?.user?.workspaceId) {
      router.push("/");
    }
  }, [session, router]);

  async function joinWorkspace() {
    if (!code || joining) return;
    setJoining(true);
    setError("");
    const res = await fetch("/api/workspace/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to join workspace");
      setJoining(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (status === "loading") return <p className="muted">Loading...</p>;
  if (!code) return <p style={{ color: "var(--danger)" }}>Invalid invite link — no code provided.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ margin: 0 }}>
        You have been invited to join a workspace.
      </p>
      {error && <p style={{ color: "var(--danger)", margin: 0 }}><small>{error}</small></p>}
      <button
        onClick={joinWorkspace}
        disabled={joining}
        style={{ background: "rgba(74,144,217,0.15)", border: "1px solid rgba(74,144,217,0.4)" }}
      >
        {joining ? "Joining..." : "Accept invite"}
      </button>
    </div>
  );
}
