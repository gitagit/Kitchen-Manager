"use client";

import { useEffect, useMemo, useState } from "react";
import { Toast } from "@/app/components/Modal";

type Recipe = { id: string; title: string; };
type GroceryItem = { id: string; name: string; channel: "SHIP"|"IN_PERSON"|"EITHER"; quantityText?: string|null; reason: string; acquired: boolean; };

export default function GroceryClient() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderResult, setReorderResult] = useState<{ added: number } | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  async function loadRecipes() {
    try {
      const res = await fetch("/api/recipes");
      if (!res.ok) throw new Error("Failed to load recipes");
      const data = await res.json();
      setRecipes((data.recipes ?? []).map((r:any)=>({id:r.id, title:r.title})));
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to load recipes", type: "error" });
    }
  }

  async function loadItems() {
    try {
      const res = await fetch("/api/grocery/plan");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { /* ignore */ }
  }

  useEffect(() => { loadRecipes(); loadItems(); }, []);

  async function plan() {
    setLoading(true);
    try {
      const ids = Object.entries(selected).filter(([,v])=>v).map(([k])=>k);
      if (ids.length === 0) {
        setToast({ message: "Select at least one recipe", type: "info" });
        return;
      }
      const res = await fetch("/api/grocery/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipeIds: ids })
      });
      if (!res.ok) throw new Error("Failed to generate list");
      const data = await res.json();
      setItems(data.items ?? []);
      setToast({ message: `Generated ${data.items?.length || 0} items`, type: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to plan", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function runReorder() {
    setReordering(true);
    setReorderResult(null);
    try {
      const res = await fetch("/api/grocery/reorder", { method: "POST" });
      if (!res.ok) throw new Error("Failed to run smart reorder");
      const data = await res.json();
      setItems(data.items ?? []);
      setReorderResult({ added: data.added ?? 0 });
      if ((data.added ?? 0) === 0) {
        setToast({ message: "Nothing new to add — list is up to date", type: "info" });
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Smart reorder failed", type: "error" });
    } finally {
      setReordering(false);
    }
  }

  async function sendToInstacart() {
    setOrdering(true);
    setFallbackText(null);
    try {
      const res = await fetch("/api/grocery/instacart", { method: "POST" });
      const data = await res.json();
      if (data.cartUrl) {
        window.open(data.cartUrl, "_blank");
      } else if (data.fallbackText) {
        setFallbackText(data.fallbackText);
      } else {
        setToast({ message: data.error || "Instacart unavailable", type: "error" });
      }
    } catch {
      setToast({ message: "Failed to connect to Instacart", type: "error" });
    } finally {
      setOrdering(false);
    }
  }

  async function copyFallback() {
    if (!fallbackText) return;
    try {
      await navigator.clipboard.writeText(fallbackText);
      setToast({ message: "Copied to clipboard!", type: "success" });
    } catch {
      setToast({ message: "Failed to copy", type: "error" });
    }
  }

  const ship = useMemo(()=>items.filter(i=>i.channel==="SHIP"), [items]);
  const inPerson = useMemo(()=>items.filter(i=>i.channel==="IN_PERSON" || i.channel==="EITHER"), [items]);
  const unacquiredCount = useMemo(()=>items.filter(i=>!i.acquired).length, [items]);

  async function copyList(which: "SHIP"|"IN_PERSON") {
    const list = (which==="SHIP" ? ship : inPerson).map(i => `- ${i.name}`).join("\n");
    try {
      await navigator.clipboard.writeText(list);
      setToast({ message: "Copied to clipboard!", type: "success" });
    } catch {
      setToast({ message: "Failed to copy. Try selecting and copying manually.", type: "error" });
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <>
      <div className="card">
        <h3>Choose recipes</h3>
        <div className="row" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <button onClick={plan} disabled={loading || selectedCount === 0}>
            {loading ? "Planning..." : `Generate list${selectedCount > 0 ? ` (${selectedCount} selected)` : ""}`}
          </button>
          <button onClick={runReorder} disabled={reordering}>
            {reordering ? "Checking..." : "✦ Smart Reorder"}
          </button>
          {selectedCount > 0 && (
            <button onClick={() => setSelected({})} style={{ color: "#888" }}>Clear selection</button>
          )}
        </div>

        {reorderResult && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 12px", background: "rgba(100,200,100,0.1)", borderRadius: 6, fontSize: 13 }}>
            <span>✦ Smart Reorder: <strong>{reorderResult.added}</strong> item{reorderResult.added !== 1 ? "s" : ""} added</span>
            <button onClick={() => setReorderResult(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", opacity: 0.5, padding: "0 4px" }}>✕</button>
          </div>
        )}

        <div className="card" style={{ maxHeight: 300, overflowY: "auto" }}>
          {recipes.length ? recipes.map(r => (
            <label key={r.id} style={{display:"block", padding:"4px 0", cursor: "pointer"}}>
              <input
                type="checkbox"
                checked={!!selected[r.id]}
                onChange={(e)=>setSelected(s=>({ ...s, [r.id]: e.target.checked }))}
              />{" "}
              {r.title}
            </label>
          )) : <small className="muted">Add recipes first.</small>}
        </div>
      </div>

      <div className="card">
        <h3>Ship ({ship.length})</h3>
        <div className="row">
          <button onClick={()=>copyList("SHIP")} disabled={!ship.length}>Copy list</button>
        </div>
        {ship.length ? (
          <ul>{ship.map(i => <li key={i.id}>{i.name} <small className="muted">({i.reason})</small></li>)}</ul>
        ) : <small className="muted">No ship items yet. Generate a list above.</small>}
      </div>

      <div className="card">
        <h3>In-person ({inPerson.length})</h3>
        <div className="row">
          <button onClick={()=>copyList("IN_PERSON")} disabled={!inPerson.length}>Copy list</button>
        </div>
        {inPerson.length ? (
          <ul>{inPerson.map(i => <li key={i.id}>{i.name} <small className="muted">({i.reason})</small></li>)}</ul>
        ) : <small className="muted">No in-person items yet. Generate a list above.</small>}
      </div>

      {unacquiredCount > 0 && (
        <div className="card">
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <button onClick={sendToInstacart} disabled={ordering}>
              {ordering ? "Opening..." : "🛒 Order on Instacart"}
            </button>
            <small className="muted" style={{ alignSelf: "center" }}>{unacquiredCount} item{unacquiredCount !== 1 ? "s" : ""} to order</small>
          </div>
          {fallbackText && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <small className="muted">Instacart not configured — copy list:</small>
                <button onClick={copyFallback} style={{ fontSize: 12, padding: "2px 8px" }}>Copy</button>
              </div>
              <textarea
                readOnly
                value={fallbackText}
                style={{ width: "100%", height: 120, fontSize: 13, resize: "vertical" }}
              />
            </div>
          )}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
