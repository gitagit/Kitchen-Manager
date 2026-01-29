"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmModal, Toast } from "@/app/components/Modal";

type Item = {
  id: string;
  name: string;
  category: string;
  location: string;
  staple: boolean;
  parLevel: number | null;
  defaultCostCents: number | null;
  batches: { id: string; quantityText: string; expiresOn: string | null; purchasedOn: string | null; costCents: number | null }[];
};

const categories = ["PANTRY","SPICE","FROZEN","PRODUCE","MEAT","DAIRY","CONDIMENT","BAKING","BEVERAGE","OTHER"];
const locations = ["PANTRY","FRIDGE","FREEZER","COUNTER","OTHER"];

function formatCost(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

type ExpirationStatus = "expired" | "expiring-soon" | "ok" | "none";

function getExpirationStatus(expiresOn: string | null): ExpirationStatus {
  if (!expiresOn) return "none";
  const now = new Date();
  const exp = new Date(expiresOn);
  const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return "expired";
  if (daysUntil <= 7) return "expiring-soon";
  return "ok";
}

function getExpirationStyle(status: ExpirationStatus): React.CSSProperties {
  switch (status) {
    case "expired":
      return { color: "#c44", fontWeight: 600 };
    case "expiring-soon":
      return { color: "#c90", fontWeight: 500 };
    default:
      return {};
  }
}

function formatExpiration(expiresOn: string | null): string {
  if (!expiresOn) return "";
  const now = new Date();
  const exp = new Date(expiresOn);
  const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return `expired ${Math.abs(daysUntil)}d ago`;
  if (daysUntil === 0) return "expires today";
  if (daysUntil === 1) return "expires tomorrow";
  if (daysUntil <= 7) return `expires in ${daysUntil}d`;
  return `exp ${exp.toLocaleDateString()}`;
}

export default function InventoryClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("PANTRY");
  const [location, setLocation] = useState("PANTRY");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const [importText, setImportText] = useState("");

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterExpiring, setFilterExpiring] = useState(false);

  // UI collapse state
  const [showImport, setShowImport] = useState(false);

  // Modal and toast state
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/items");
      if (!res.ok) throw new Error("Failed to load inventory");
      const data = await res.json();
      setItems(data.items);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to load inventory", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function addItem() {
    if (!name.trim()) return;
    setSaving(true);

    try {
      const costCents = cost ? Math.round(parseFloat(cost) * 100) : undefined;

      const res = editingId
        ? await fetch("/api/inventory/items", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: editingId,
              item: { name, category, location, defaultCostCents: costCents },
              batch: editingBatchId
                ? { id: editingBatchId, quantityText: qty, costCents }
                : { quantityText: qty, costCents }
            })
          })
        : await fetch("/api/inventory/items", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              item: { name, category, location, defaultCostCents: costCents },
              batch: { quantityText: qty, costCents }
            })
          });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.fieldErrors?.name?.[0] || "Failed to save item");
      }

      setToast({ message: editingId ? "Item updated" : "Item added", type: "success" });
      cancelEdit();
      await refresh();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to save item", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingBatchId(null);
    setName("");
    setCategory("PANTRY");
    setLocation("PANTRY");
    setQty("1");
    setCost("");
  }

  async function runImport() {
    if (!importText.trim()) return;
    setImporting(true);

    try {
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: importText })
      });

      if (!res.ok) throw new Error("Failed to import items");

      const data = await res.json();
      setToast({ message: `Imported ${data.count || "items"} successfully`, type: "success" });
      setImportText("");
      await refresh();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to import", type: "error" });
    } finally {
      setImporting(false);
    }
  }

  function promptDelete(id: string, itemName: string) {
    setDeleteModal({ id, name: itemName });
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/inventory/items?id=${deleteModal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");

      setToast({ message: `"${deleteModal.name}" deleted`, type: "success" });
      setDeleteModal(null);
      await refresh();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to delete", type: "error" });
    } finally {
      setDeleting(false);
    }
  }

  function editItem(it: Item) {
    setEditingId(it.id);
    setEditingBatchId(it.batches[0]?.id || null);
    setName(it.name);
    setCategory(it.category);
    setLocation(it.location);
    setQty(it.batches[0]?.quantityText || "1");
    const itemCost = it.batches[0]?.costCents ?? it.defaultCostCents;
    setCost(itemCost ? (itemCost / 100).toFixed(2) : "");
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Count expiring items
  const expiringCount = useMemo(() => {
    return items.filter(it => {
      const status = getExpirationStatus(it.batches[0]?.expiresOn ?? null);
      return status === "expired" || status === "expiring-soon";
    }).length;
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (searchQuery && !it.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCategory && it.category !== filterCategory) return false;
      if (filterLocation && it.location !== filterLocation) return false;
      if (filterExpiring) {
        const status = getExpirationStatus(it.batches[0]?.expiresOn ?? null);
        if (status !== "expired" && status !== "expiring-soon") return false;
      }
      return true;
    });
  }, [items, searchQuery, filterCategory, filterLocation, filterExpiring]);

  const grouped = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of filtered) {
      const k = it.category;
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    return Array.from(m.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <>
      <div className="card" style={editingId ? { border: "2px solid var(--accent, #4a9eff)" } : undefined}>
        <h3>{editingId ? "Edit Item" : "Quick Add"}</h3>
        <div className="row">
          <input placeholder="item name (e.g., canned chickpeas)" value={name} onChange={e=>setName(e.target.value)} />
          <input style={{maxWidth:140}} placeholder="qty (e.g., 2 cans)" value={qty} onChange={e=>setQty(e.target.value)} />
          <input style={{maxWidth:100}} placeholder="cost $" value={cost} onChange={e=>setCost(e.target.value)} type="number" step="0.01" min="0" />
          <select value={category} onChange={e=>setCategory(e.target.value)}>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select value={location} onChange={e=>setLocation(e.target.value)}>
            {locations.map(l=><option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={addItem} disabled={saving}>{saving ? "Saving..." : editingId ? "Update" : "Add"}</button>
          {editingId && <button onClick={cancelEdit} style={{color: "#888"}}>Cancel</button>}
          <button onClick={refresh} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
        </div>
        <p><small className="muted">{editingId ? "Editing item. Click Update to save changes or Cancel to discard." : "Names are normalized to lowercase for matching."}</small></p>
      </div>

      <div className="card">
        <h3
          className="collapsible-header"
          onClick={() => setShowImport(!showImport)}
        >
          <span className={`collapse-icon ${showImport ? "open" : ""}`}>▶</span>
          Bulk Import
        </h3>

        {showImport && (
          <>
            <p style={{marginTop: 8}}><small className="muted">Paste a rough list. Format example:</small></p>
            <pre style={{marginTop:8}}>
{`Pantry:
- canned chickpeas (2 cans)
- rice
Spices:
- black pepper
Freezer:
- frozen salmon (2 filets)`}
            </pre>
            <textarea rows={6} style={{width:"100%", marginTop: 8}} value={importText} onChange={e=>setImportText(e.target.value)} />
            <div className="row" style={{marginTop:8}}>
              <button onClick={runImport} disabled={importing}>{importing ? "Importing..." : "Import"}</button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3>Filter</h3>
        <div className="row">
          <input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{minWidth: 200}}
          />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
            <option value="">All locations</option>
            {locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button
            onClick={() => setFilterExpiring(!filterExpiring)}
            style={{
              background: filterExpiring ? "#c90" : undefined,
              color: filterExpiring ? "#fff" : undefined,
              border: filterExpiring ? "none" : undefined
            }}
          >
            {filterExpiring ? "Showing expiring" : `Expiring soon${expiringCount > 0 ? ` (${expiringCount})` : ""}`}
          </button>
          {(searchQuery || filterCategory || filterLocation || filterExpiring) && (
            <button onClick={() => { setSearchQuery(""); setFilterCategory(""); setFilterLocation(""); setFilterExpiring(false); }}>
              Clear filters
            </button>
          )}
        </div>
        <p style={{marginTop: 8, marginBottom: 0}}>
          <small className="muted">Showing {filtered.length} of {items.length} items</small>
        </p>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="spinner large"></span>
          <span>Loading inventory...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No items yet</h3>
          <p>Add your first inventory item using Quick Add above.</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No matches</h3>
          <p>No items match your current filters. Try adjusting them.</p>
        </div>
      ) : grouped.map(([cat, list]) => (
        <div key={cat} className="card">
          <h3>{cat}</h3>
          <table>
            <thead>
              <tr>
                <th style={{width:"22%"}}>Item</th>
                <th style={{width:"10%"}}>Location</th>
                <th style={{width:"35%"}}>Latest batch</th>
                <th style={{width:"10%"}}>Cost</th>
                <th style={{width:"23%"}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(it => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td data-label="Location">{it.location}</td>
                  <td data-label="Stock">
                    {it.batches[0] ? (
                      <>
                        {it.batches[0].quantityText}
                        {it.batches[0].expiresOn && (
                          <span style={{ marginLeft: 8, ...getExpirationStyle(getExpirationStatus(it.batches[0].expiresOn)) }}>
                            • {formatExpiration(it.batches[0].expiresOn)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td data-label="Cost">
                    <span className={it.batches[0]?.costCents != null ? "" : "muted"}>
                      {formatCost(it.batches[0]?.costCents ?? it.defaultCostCents)}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => editItem(it)} style={{marginRight: 4, padding: "2px 8px"}}>Edit</button>
                    <button onClick={() => promptDelete(it.id, it.name)} style={{padding: "2px 8px", color: "#c44"}}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <ConfirmModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteModal?.name}" and all its batches? This cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />

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
