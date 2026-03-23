import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import NavLink from "./NavLink";
import ServiceWorkerRegistration from "./sw-register";
import LogoutButton from "./LogoutButton";
import NextAuthSessionProvider from "./SessionProvider";
import WorkspaceGuard from "./WorkspaceGuard";
import ThemeToggle from "./ThemeToggle";
import KeyboardShortcuts from "./KeyboardShortcuts";

export const metadata: Metadata = {
  title: "Mise en App",
  description: "Inventory, recipes, suggestions, grocery planning, and skill growth",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mise en App",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4a90d9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)})()` }} />
      </head>
      <body>
        <NextAuthSessionProvider>
          <WorkspaceGuard>
            <ServiceWorkerRegistration />
            <KeyboardShortcuts />
            <a href="#main-content" className="skip-link">Skip to content</a>
            <nav aria-label="Main navigation">
              <Link href="/" style={{fontWeight:600}}>🍳 Kitchen</Link>
              <NavLink href="/inventory">Inventory</NavLink>
              <NavLink href="/recipes">Recipes</NavLink>
              <NavLink href="/suggest">Suggest</NavLink>
              <NavLink href="/grocery">Grocery</NavLink>
              <NavLink href="/mealplan">Plan</NavLink>
              <NavLink href="/history">History</NavLink>
              <NavLink href="/techniques">Skills</NavLink>
              <NavLink href="/stats">Stats</NavLink>
              <NavLink href="/preferences">Preferences</NavLink>
              <NavLink href="/welcome">Help</NavLink>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <ThemeToggle />
                <LogoutButton />
              </div>
            </nav>
            <main id="main-content">{children}</main>
          </WorkspaceGuard>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
