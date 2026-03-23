"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normName } from "@/lib/normalize";
import Modal, { Toast } from "@/app/components/Modal";

type PlanRecipe = {
  title: string;
  servings: number;
  caloriesPerServing: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

type MealPlan = {
  id: string;
  date: string;
  slot: string;
  recipeId: string | null;
  notes: string | null;
  servings?: number | null;
  recipe?: PlanRecipe | null;
};

type NutritionGoals = {
  calorieGoal:  number | null;
  proteinGoalG: number | null;
  carbsGoalG:   number | null;
  fatGoalG:     number | null;
};

function computeDayMacros(dayPlans: MealPlan[]): { cals: number; protein: number; carbs: number; fat: number } | null {
  let cals = 0, protein = 0, carbs = 0, fat = 0, hasCals = false;
  for (const p of dayPlans) {
    const r = p.recipe;
    if (!r || r.servings <= 0) continue;
    const scale = (p.servings ?? r.servings) / r.servings;
    if (r.caloriesPerServing != null) { cals    += Math.round(r.caloriesPerServing * scale); hasCals = true; }
    if (r.proteinG != null)           { protein += Math.round(r.proteinG * scale); }
    if (r.carbsG   != null)           { carbs   += Math.round(r.carbsG   * scale); }
    if (r.fatG     != null)           { fat     += Math.round(r.fatG     * scale); }
  }
  return hasCals ? { cals, protein, carbs, fat } : null;
}

type Recipe = {
  id: string;
  title: string;
  servings: number;
  totalMin: number;
  ingredients: { name: string; quantityText: string | null }[];
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
  const [showBatchPrep, setShowBatchPrep] = useState(false);
  const [goals, setGoals] = useState<NutritionGoals>({ calorieGoal: null, proteinGoalG: null, carbsGoalG: null, fatGoalG: null });
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

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
    setRecipes(data.recipes.map((r: any) => ({
      id: r.id,
      title: r.title,
      servings: r.servings || 2,
      totalMin: r.totalMin || 30,
      ingredients: r.ingredients?.map((i: any) => ({ name: i.name, quantityText: i.quantityText ?? null })) ?? []
    })));
  }

  useEffect(() => {
    fetchRecipes();
    fetch("/api/preferences")
      .then(r => r.json())
      .then(d => setGoals({
        calorieGoal:  d.calorieGoal  ?? null,
        proteinGoalG: d.proteinGoalG ?? null,
        carbsGoalG:   d.carbsGoalG   ?? null,
        fatGoalG:     d.fatGoalG     ?? null,
      }))
      .catch(() => {});
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

  async function movePlan(fromDate: string, fromSlot: string, toDate: string, toSlot: string) {
    if (fromDate === toDate && fromSlot === toSlot) return;
    const source = plans.find(p => p.date.startsWith(fromDate) && p.slot === fromSlot);
    if (!source?.recipeId) return;
    await fetch("/api/mealplan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: toDate,
        slot: toSlot,
        recipeId: source.recipeId,
        notes: source.notes || undefined,
        servings: source.servings || undefined
      })
    });
    await fetch(`/api/mealplan?id=${source.id}`, { method: "DELETE" });
    await fetchPlans();
    setToast({ message: "Meal moved", type: "success" });
  }

  const [autoFilling, setAutoFilling] = useState(false);

  async function autoFillFromExpiring() {
    setAutoFilling(true);
    try {
      const res = await fetch("/api/suggest");
      if (!res.ok) { setToast({ message: "Failed to get suggestions", type: "error" }); return; }
      const data = await res.json();
      const suggested: { recipeId: string; title: string }[] = data.results ?? [];
      if (!suggested.length) { setToast({ message: "No recipe suggestions available", type: "info" }); return; }

      const emptySlots: { date: string; slot: string }[] = [];
      for (const date of weekDates) {
        for (const slot of ["dinner", "lunch", "breakfast"] as const) {
          if (!getPlan(date, slot)?.recipeId) {
            emptySlots.push({ date: formatDate(date), slot });
          }
        }
      }
      if (!emptySlots.length) { setToast({ message: "No empty slots this week", type: "info" }); return; }

      const usedRecipeIds = new Set(plans.filter(p => p.recipeId).map(p => p.recipeId));
      let filled = 0;
      for (const slot of emptySlots) {
        const recipe = suggested.find(s => !usedRecipeIds.has(s.recipeId));
        if (!recipe) break;
        usedRecipeIds.add(recipe.recipeId);
        await fetch("/api/mealplan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date: slot.date, slot: slot.slot, recipeId: recipe.recipeId }),
        });
        filled++;
      }

      await fetchPlans();
      setToast({ message: `Auto-filled ${filled} meal${filled !== 1 ? "s" : ""} from top suggestions`, type: "success" });
    } finally {
      setAutoFilling(false);
    }
  }

  async function sendToGrocery() {
    const ids = [...new Set(plans.filter(p => p.recipeId).map(p => p.recipeId as string))];
    if (!ids.length) { setToast({ message: "No recipes planned this week", type: "info" }); return; }
    const res = await fetch("/api/grocery/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipeIds: ids })
    });
    const data = await res.json();
    setToast({ message: `${data.created ?? 0} items added to grocery list`, type: "success" });
  }

  // Batch prep data
  const batchPrepData = useMemo(() => {
    const weekRecipes = recipes.filter(r => plans.some(p => p.recipeId === r.id));
    const ingMap = new Map<string, { display: string; entries: string[] }>();
    for (const recipe of weekRecipes) {
      for (const ing of recipe.ingredients) {
        const key = normName(ing.name);
        if (!ingMap.has(key)) ingMap.set(key, { display: ing.name, entries: [] });
        const qty = ing.quantityText ? `${ing.quantityText} (${recipe.title})` : recipe.title;
        ingMap.get(key)!.entries.push(qty);
      }
    }
    const sortedIngs = [...ingMap.values()].sort((a, b) => a.display.localeCompare(b.display));
    return { weekRecipes, sortedIngs };
  }, [recipes, plans]);

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
        <div style={{ textAlign: "center", marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>
          <button
            onClick={sendToGrocery}
            disabled={!plans.some(p => p.recipeId)}
            title="Generate grocery list from this week's recipes"
          >
            &rarr; Grocery list
          </button>
          <button
            onClick={() => setShowBatchPrep(true)}
            disabled={!plans.some(p => p.recipeId)}
            title="View combined prep list for this week"
          >
            Batch prep
          </button>
          <button
            onClick={autoFillFromExpiring}
            disabled={autoFilling}
            title="Auto-fill empty slots with top recipe suggestions (prioritizes expiring ingredients)"
          >
            {autoFilling ? "Filling..." : "Auto-fill"}
          </button>
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
                  const cellKey = `${formatDate(date)}:${slot}`;
                  return (
                    <td
                      key={date.toISOString()}
                      className={`meal-cell${dragOver === cellKey ? " drag-over" : ""}`}
                      draggable={!!hasRecipe}
                      onClick={() => openEditor(date, slot)}
                      onDragStart={e => {
                        e.dataTransfer.setData("text/plain", `${formatDate(date)}:${slot}`);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOver(cellKey);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={e => {
                        e.preventDefault();
                        setDragOver(null);
                        const [fromDate, fromSlot] = e.dataTransfer.getData("text/plain").split(":");
                        if (fromDate && fromSlot) movePlan(fromDate, fromSlot, formatDate(date), slot);
                      }}
                      style={{
                        padding: 8,
                        border: "1px solid rgba(127,127,127,0.2)",
                        cursor: hasRecipe ? "grab" : "pointer",
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
        <div style={{ padding: 16 }}>
          <div className="skeleton skeleton-line medium" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      )}

      {/* Weekly Nutrition Summary */}
      {(() => {
        const dayMacrosList = weekDates.map(d => {
          const dayPlans = plans.filter(p => p.date.startsWith(formatDate(d)) && p.recipeId);
          return computeDayMacros(dayPlans);
        });
        const hasAnyData = dayMacrosList.some(m => m !== null);
        if (!hasAnyData) return null;

        const macroRows: { label: string; key: "cals" | "protein" | "carbs" | "fat"; unit: string; goal: number | null }[] = [
          { label: "Calories", key: "cals",    unit: "kcal", goal: goals.calorieGoal },
          { label: "Protein",  key: "protein", unit: "g",    goal: goals.proteinGoalG },
          { label: "Carbs",    key: "carbs",   unit: "g",    goal: goals.carbsGoalG },
          { label: "Fat",      key: "fat",     unit: "g",    goal: goals.fatGoalG },
        ];

        const weekTotals = dayMacrosList.reduce<{ cals: number; protein: number; carbs: number; fat: number }>(
          (acc, d) => d ? { cals: acc.cals + d.cals, protein: acc.protein + d.protein, carbs: acc.carbs + d.carbs, fat: acc.fat + d.fat } : acc,
          { cals: 0, protein: 0, carbs: 0, fat: 0 }
        );

        const daysWithData = dayMacrosList.filter(d => d !== null).length;

        return (
          <div className="card" style={{ marginTop: 0 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 15 }}>This Week&apos;s Nutrition</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 8px", width: 70, opacity: 0.6, fontWeight: 500 }}></th>
                    {weekDates.map((d, i) => (
                      <th key={i} style={{ textAlign: "center", padding: "4px 8px", minWidth: 72, opacity: 0.7, fontWeight: 500 }}>
                        {DAY_NAMES[d.getDay()]}
                      </th>
                    ))}
                    <th style={{ textAlign: "center", padding: "4px 8px", minWidth: 72, opacity: 0.7, fontWeight: 500 }}>Week</th>
                  </tr>
                </thead>
                <tbody>
                  {macroRows.map(({ label, key, unit }) => (
                    <tr key={label}>
                      <td style={{ padding: "4px 8px", opacity: 0.65, whiteSpace: "nowrap" }}>{label}</td>
                      {dayMacrosList.map((m, i) => (
                        <td key={i} style={{ textAlign: "center", padding: "4px 8px" }}>
                          {m ? `${m[key]}${unit === "kcal" ? "" : "g"}` : <span style={{ opacity: 0.25 }}>&mdash;</span>}
                        </td>
                      ))}
                      <td style={{ textAlign: "center", padding: "4px 8px", fontWeight: 500 }}>
                        {daysWithData > 0 ? `${weekTotals[key]}${unit === "kcal" ? "" : "g"}` : <span style={{ opacity: 0.25 }}>&mdash;</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Weekly progress bars */}
            {macroRows.some(r => r.goal != null) && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {macroRows.filter(r => r.goal != null).map(({ label, key, unit, goal }) => {
                  const weekGoal = goal! * 7;
                  const total = weekTotals[key];
                  const pct = Math.min(100, Math.round((total / weekGoal) * 100));
                  const color = pct >= 90 ? "rgba(100,200,100,0.7)" : "rgba(100,150,255,0.7)";
                  return (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3, opacity: 0.8 }}>
                        <span>{label}</span>
                        <span>{total}{unit === "kcal" ? " kcal" : "g"} / {weekGoal}{unit === "kcal" ? " kcal" : "g"} weekly goal &middot; {pct}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Edit Slot Modal */}
      {editingSlot && (
        <Modal
          open={true}
          onClose={() => setEditingSlot(null)}
          title={`${editingSlot.slot.charAt(0).toUpperCase() + editingSlot.slot.slice(1)} \u2014 ${formatDisplayDate(editingSlot.date)}`}
          maxWidth={420}
          actions={
            <>
              <button onClick={clearSlot} className="btn-danger">Clear</button>
              <button onClick={() => setEditingSlot(null)} style={{ color: "#888" }}>Cancel</button>
              <button onClick={savePlan}>Save</button>
            </>
          }
        >
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
                      <div style={{ padding: "8px 12px", color: "#888" }}>No recipes match &quot;{recipeSearch}&quot;</div>
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

          <div>
            <label style={{ display: "block", marginBottom: 4 }}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              style={{ width: "100%" }}
              placeholder="e.g., Leftovers, Eating out..."
            />
          </div>
        </Modal>
      )}

      {/* Batch Prep Modal */}
      {showBatchPrep && (
        <Modal
          open={true}
          onClose={() => setShowBatchPrep(false)}
          title="Batch Prep"
          maxWidth={680}
          actions={
            <>
              <button onClick={() => { sendToGrocery(); setShowBatchPrep(false); }}>
                &rarr; Grocery list
              </button>
              <button onClick={() => setShowBatchPrep(false)} style={{ color: "#888" }}>Close</button>
            </>
          }
        >
          <div style={{ maxHeight: "65vh", overflowY: "auto" }}>
            <small className="muted">
              {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} &ndash; {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </small>

            <h4 style={{ marginTop: 16, marginBottom: 8 }}>This week&apos;s recipes</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {batchPrepData.weekRecipes.map(r => (
                <li key={r.id} style={{ marginBottom: 4 }}>
                  {r.title}
                  <small className="muted" style={{ marginLeft: 8 }}>{r.totalMin}m &bull; serves {r.servings}</small>
                </li>
              ))}
            </ul>

            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Combined ingredients</h4>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {batchPrepData.sortedIngs.map(({ display, entries }) => (
                <li key={display} style={{ marginBottom: 4 }}>
                  <strong>{display}</strong>
                  <small className="muted" style={{ marginLeft: 8 }}>{entries.join(" \u00b7 ")}</small>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </>
  );
}
