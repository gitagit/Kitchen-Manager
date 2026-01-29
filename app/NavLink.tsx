"use client";

import { usePathname } from "next/navigation";

export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <a
      href={href}
      style={{
        fontWeight: isActive ? 600 : 400,
        background: isActive ? "rgba(74, 144, 217, 0.15)" : undefined,
        color: isActive ? "var(--accent)" : undefined,
      }}
    >
      {children}
    </a>
  );
}
