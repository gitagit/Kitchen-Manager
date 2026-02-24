"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
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
