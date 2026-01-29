"use client";

import { useEffect, useMemo, useState } from "react";
import { Toast } from "@/app/components/Modal";

type Recipe = { id: string; title: string; };
type GroceryItem = { id: string; name: string; channel: "SHIP"|"IN_PERSON"; quantityText?: string|null; reason: string; };

export default function GroceryClient() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => { loadRecipes(); }, []);

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

  const ship = useMemo(()=>items.filter(i=>i.channel==="SHIP"), [items]);
  const inPerson = useMemo(()=>items.filter(i=>i.channel==="IN_PERSON"), [items]);

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
        <div className="row" style={{ marginBottom: 8 }}>
          <button onClick={plan} disabled={loading || selectedCount === 0}>
            {loading ? "Planning..." : `Generate list${selectedCount > 0 ? ` (${selectedCount} selected)` : ""}`}
          </button>
          {selectedCount > 0 && (
            <button onClick={() => setSelected({})} style={{ color: "#888" }}>Clear selection</button>
          )}
        </div>
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
