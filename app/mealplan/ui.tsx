"use client";

import { useEffect, useMemo, useState } from "react";

type MealPlan = {
  id: string;
  date: string;
  slot: string;
  recipeId: string | null;
  notes: string | null;
  servings?: number | null;
};

type Recipe = {
  id: string;
  title: string;
  servings: number;
};

const SLOTS = ["breakfast", "lunch", "dinner"] as const;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const day = baseDate.getDay();
  const sunday = new Date(baseDate);
  sunday.setDate(baseDate.getDate() - day);

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}

export default function MealPlanClient() {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Modal state for editing a slot
  const [editingSlot, setEditingSlot] = useState<{ date: Date; slot: string } | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [servings, setServings] = useState<number>(2);
  const [recipeSearch, setRecipeSearch] = useState("");

  // Filtered recipes for dropdown
  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return recipes;
    const search = recipeSearch.toLowerCase();
    return recipes.filter(r => r.title.toLowerCase().includes(search));
  }, [recipes, recipeSearch]);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  async function fetchPlans() {
    setLoading(true);
    const start = formatDate(weekDates[0]);
    const end = formatDate(weekDates[6]);
    const res = await fetch(`/api/mealplan?start=${start}&end=${end}`);
    const data = await res.json();
    setPlans(data.plans);
    setLoading(false);
  }

  async function fetchRecipes() {
    const res = await fetch("/api/recipes");
    const data = await res.json();
    setRecipes(data.recipes.map((r: any) => ({ id: r.id, title: r.title, servings: r.servings || 2 })));
  }

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [weekOffset]);

  function getPlan(date: Date, slot: string): MealPlan | undefined {
    const dateStr = formatDate(date);
    return plans.find(p => p.date.startsWith(dateStr) && p.slot === slot);
  }

  function getRecipeTitle(recipeId: string | null): string {
    if (!recipeId) return "";
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe?.title || "Unknown recipe";
  }

  function openEditor(date: Date, slot: string) {
    const existing = getPlan(date, slot);
    setEditingSlot({ date, slot });
    setSelectedRecipeId(existing?.recipeId || "");
    setNotes(existing?.notes || "");
    setRecipeSearch("");
    // Set servings from existing plan or recipe default
    if (existing?.servings) {
      setServings(existing.servings);
    } else if (existing?.recipeId) {
      const recipe = recipes.find(r => r.id === existing.recipeId);
      setServings(recipe?.servings || 2);
    } else {
      setServings(2);
    }
  }

  function selectRecipe(recipeId: string) {
    setSelectedRecipeId(recipeId);
    setRecipeSearch("");
    // Set default servings from recipe
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe) {
      setServings(recipe.servings);
    }
  }

  async function savePlan() {
    if (!editingSlot) return;

    await fetch("/api/mealplan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: formatDate(editingSlot.date),
        slot: editingSlot.slot,
        recipeId: selectedRecipeId || undefined,
        notes: notes || undefined,
        servings: selectedRecipeId ? servings : undefined
      })
    });

    setEditingSlot(null);
    await fetchPlans();
  }

  async function clearSlot() {
    if (!editingSlot) return;
    const existing = getPlan(editingSlot.date, editingSlot.slot);

    if (existing) {
      await fetch(`/api/mealplan?id=${existing.id}`, { method: "DELETE" });
    }

    setEditingSlot(null);
    await fetchPlans();
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setWeekOffset(w => w - 1)}>&larr; Previous Week</button>
          <h3 style={{ margin: 0 }}>
            {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </h3>
          <button onClick={() => setWeekOffset(w => w + 1)}>Next Week &rarr;</button>
        </div>
        {weekOffset !== 0 && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button onClick={() => setWeekOffset(0)} style={{ padding: "2px 8px", fontSize: 12 }}>
              Go to current week
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: 80, textAlign: "left", padding: 8 }}>Slot</th>
              {weekDates.map(d => (
                <th key={d.toISOString()} style={{ padding: 8, textAlign: "center", minWidth: 100 }}>
                  {formatDisplayDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot => (
              <tr key={slot}>
                <td style={{ padding: 8, fontWeight: 500, textTransform: "capitalize" }}>{slot}</td>
                {weekDates.map(date => {
                  const plan = getPlan(date, slot);
                  const hasRecipe = plan?.recipeId;
                  return (
                    <td
                      key={date.toISOString()}
                      onClick={() => openEditor(date, slot)}
                      style={{
                        padding: 8,
                        border: "1px solid rgba(127,127,127,0.2)",
                        cursor: "pointer",
                        verticalAlign: "top",
                        minHeight: 60,
                        background: hasRecipe ? "rgba(100,180,100,0.1)" : "transparent"
                      }}
                    >
                      {hasRecipe ? (
                        <div style={{ fontSize: 13 }}>
                          {getRecipeTitle(plan.recipeId)}
                          {plan.servings && <small className="muted" style={{ display: "block" }}>({plan.servings} servings)</small>}
                        </div>
                      ) : plan?.notes ? (
                        <div style={{ fontSize: 12, color: "#888" }}>{plan.notes}</div>
                      ) : (
                        <div style={{ fontSize: 12, color: "#aaa" }}>+</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="loading-state" style={{padding: 16}}>
          <span className="spinner"></span>
          <span>Loading...</span>
        </div>
      )}

      {/* Edit Modal */}
      {editingSlot && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}
          onClick={() => setEditingSlot(null)}
        >
          <div
            className="card"
            style={{ minWidth: 320, maxWidth: 400 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              {editingSlot.slot.charAt(0).toUpperCase() + editingSlot.slot.slice(1)} - {formatDisplayDate(editingSlot.date)}
            </h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Recipe</label>
              {selectedRecipeId ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(100,180,100,0.15)", borderRadius: 6 }}>
                  <span style={{ flex: 1 }}>{getRecipeTitle(selectedRecipeId)}</span>
                  <button onClick={() => setSelectedRecipeId("")} style={{ padding: "2px 8px", fontSize: 12 }}>Change</button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={recipeSearch}
                    onChange={e => setRecipeSearch(e.target.value)}
                    placeholder="Search recipes..."
                    style={{ width: "100%" }}
                    autoFocus
                  />
                  {(recipeSearch || filteredRecipes.length > 0) && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      maxHeight: 200,
                      overflowY: "auto",
                      background: "var(--card-bg, #fff)",
                      border: "1px solid rgba(127,127,127,0.3)",
                      borderRadius: 6,
                      marginTop: 4,
                      zIndex: 10
                    }}>
                      <div
                        onClick={() => { setSelectedRecipeId(""); setRecipeSearch(""); }}
                        style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid rgba(127,127,127,0.1)", color: "#888" }}
                      >
                        -- No recipe (notes only) --
                      </div>
                      {filteredRecipes.slice(0, 20).map(r => (
                        <div
                          key={r.id}
                          onClick={() => selectRecipe(r.id)}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            borderBottom: "1px solid rgba(127,127,127,0.1)"
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(127,127,127,0.1)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          {r.title}
                          <small className="muted" style={{ marginLeft: 8 }}>serves {r.servings}</small>
                        </div>
                      ))}
                      {filteredRecipes.length > 20 && (
                        <div style={{ padding: "8px 12px", color: "#888", fontSize: 12 }}>
                          ...and {filteredRecipes.length - 20} more. Type to filter.
                        </div>
                      )}
                      {filteredRecipes.length === 0 && recipeSearch && (
                        <div style={{ padding: "8px 12px", color: "#888" }}>No recipes match "{recipeSearch}"</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedRecipeId && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4 }}>Servings</label>
                <input
                  type="number"
                  value={servings}
                  onChange={e => setServings(parseInt(e.target.value) || 2)}
                  min={1}
                  style={{ width: 80 }}
                />
                <small className="muted" style={{ marginLeft: 8 }}>
                  (recipe default: {recipes.find(r => r.id === selectedRecipeId)?.servings || 2})
                </small>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{ width: "100%" }}
                placeholder="e.g., Leftovers, Eating out..."
              />
            </div>

            <div className="row">
              <button onClick={savePlan}>Save</button>
              <button onClick={clearSlot} style={{ color: "#c44" }}>Clear</button>
              <button onClick={() => setEditingSlot(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
