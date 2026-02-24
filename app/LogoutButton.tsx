"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        marginLeft: "auto",
        padding: "4px 10px",
        fontSize: "0.85em",
        opacity: 0.6,
        border: "1px solid rgba(127,127,127,0.3)",
      }}
    >
      Sign out
    </button>
  );
}
