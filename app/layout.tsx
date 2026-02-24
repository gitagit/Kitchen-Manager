import "./globals.css";
import type { Metadata, Viewport } from "next";
import NavLink from "./NavLink";
import ServiceWorkerRegistration from "./sw-register";
import LogoutButton from "./LogoutButton";

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
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        <nav>
          <a href="/" style={{fontWeight:600}}>🍳 Kitchen</a>
          <NavLink href="/inventory">Inventory</NavLink>
          <NavLink href="/recipes">Recipes</NavLink>
          <NavLink href="/suggest">Suggest</NavLink>
          <NavLink href="/grocery">Grocery</NavLink>
          <NavLink href="/mealplan">Plan</NavLink>
          <NavLink href="/history">History</NavLink>
          <NavLink href="/techniques">Skills</NavLink>
          <NavLink href="/stats">Stats</NavLink>
          <NavLink href="/preferences">Preferences</NavLink>
          {process.env.SITE_SECRET && <LogoutButton />}
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
