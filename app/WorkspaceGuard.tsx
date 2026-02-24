"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// Paths that don't require a workspace (setup flow)
const SETUP_PATHS = new Set(["/workspace/setup", "/join", "/login", "/register"]);

export default function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (SETUP_PATHS.has(pathname)) return;
    if (!session.user.workspaceId) {
      router.push("/workspace/setup");
    }
  }, [status, session, pathname, router]);

  return <>{children}</>;
}
