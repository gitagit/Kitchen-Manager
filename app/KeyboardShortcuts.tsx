"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SHORTCUTS = [
  { key: "?", description: "Show keyboard shortcuts" },
  { key: "/", description: "Focus search field" },
  { key: "g i", description: "Go to Inventory" },
  { key: "g r", description: "Go to Recipes" },
  { key: "g s", description: "Go to Suggest" },
  { key: "g l", description: "Go to Grocery" },
  { key: "g p", description: "Go to Meal Plan" },
  { key: "g h", description: "Go to History" },
  { key: "g k", description: "Go to Skills" },
  { key: "g t", description: "Go to Stats" },
];

const NAV_MAP: Record<string, string> = {
  i: "/inventory",
  r: "/recipes",
  s: "/suggest",
  l: "/grocery",
  p: "/mealplan",
  h: "/history",
  k: "/techniques",
  t: "/stats",
};

export default function KeyboardShortcuts() {
  const [show, setShow] = useState(false);
  const [gPending, setGPending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let gTimeout: ReturnType<typeof setTimeout>;

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
        (e.target as HTMLElement).isContentEditable;

      // Always handle Escape to close help
      if (e.key === "Escape" && show) {
        setShow(false);
        return;
      }

      // Don't handle shortcuts when typing in inputs
      if (inInput) return;

      if (e.key === "?") {
        e.preventDefault();
        setShow(s => !s);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="earch"], input[type="search"], input[placeholder*="ilter"]'
        );
        searchInput?.focus();
        return;
      }

      if (e.key === "g" && !gPending) {
        setGPending(true);
        gTimeout = setTimeout(() => setGPending(false), 1000);
        return;
      }

      if (gPending) {
        setGPending(false);
        clearTimeout(gTimeout);
        const path = NAV_MAP[e.key];
        if (path) {
          e.preventDefault();
          router.push(path);
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [show, gPending, router]);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={() => setShow(false)}
    >
      <div
        className="card"
        style={{ minWidth: 300, maxWidth: 400, padding: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Keyboard Shortcuts</h3>
          <button
            onClick={() => setShow(false)}
            aria-label="Close"
            style={{ background: "none", border: "none", fontSize: 18, opacity: 0.6, padding: "4px 8px" }}
          >
            x
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {SHORTCUTS.map(s => (
              <tr key={s.key}>
                <td style={{ padding: "6px 8px", width: 80 }}>
                  {s.key.split(" ").map((k, i) => (
                    <span key={i}>
                      {i > 0 && <span style={{ opacity: 0.4, margin: "0 4px" }}>then</span>}
                      <span className="kbd">{k}</span>
                    </span>
                  ))}
                </td>
                <td style={{ padding: "6px 8px", opacity: 0.8 }}>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "12px 0 0", fontSize: 12, opacity: 0.5 }}>
          Press <span className="kbd">?</span> to toggle this help
        </p>
      </div>
    </div>
  );
}
