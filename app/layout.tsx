import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Kitchen Manager",
  description: "Inventory, recipes, suggestions, grocery planning, and skill growth",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import NavLink from "./NavLink";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
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
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
