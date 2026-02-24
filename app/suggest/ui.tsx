"use client";

import { useEffect, useState, useRef } from "react";
import { normName } from "@/lib/normalize";

type Result = {
  recipeId: string;
  title: string;
  score: number;
  have: string[];
  missing: string[];
  swaps: Record<string, string[]>;
  why: string[];
  cuisine?: string;
  complexity?: string;
  techniques?: string[];
  costPerServing?: number | null;
};

type LogForm = {
  recipeId: string;
  title: string;
} | null;

type LogInventoryMatch = {
  itemId: string;
  batchId: string | null;
  itemName: string;
  category: string;
  location: string;
  currentQty: string;
  action: "skip" | "remove" | "update";
  newQty: string;
};

type GeneratedRecipe = {
  title: string;
  cuisine?: string;
  complexity?: string;
  servings: number;
  servingsMax?: number;
  handsOnMin: number;
  totalMin: number;
  difficulty: number;
  equipment: string[];
  tags: string[];
  seasons: string[];
  instructions: string;
  ingredients: {
    name: string;
    required: boolean;
    quantityText?: string;
    preparation?: string;
    substitutions?: string[];
  }[];
  techniques?: string[];
  reasoning?: string;
};

export default function SuggestClient() {
  const [servings, setServings] = useState(2);
  const [maxTotalMin, setMaxTotalMin] = useState(45);
  const [equipment, setEquipment] = useState("OVEN,STOVETOP");
  const [occasion, setOccasion] = useState<"BREAKFAST"|"LUNCH"|"DINNER"|"SNACK"|"WEEKNIGHT"|"POTLUCK"|"MEAL_PREP"|"ANY">("ANY");
  const [mustUse, setMustUse] = useState("");
  const [tagsInclude, setTagsInclude] = useState("");
  const [tagsExclude, setTagsExclude] = useState("");
  
  // New state
  const [cuisine, setCuisine] = useState("");
  const [wantVariety, setWantVariety] = useState(true);
  const [wantGrowth, setWantGrowth] = useState(false);
  const [complexity, setComplexity] = useState<"FAMILIAR"|"STRETCH"|"CHALLENGE"|"ANY">("ANY");
  const [season, setSeason] = useState<"SPRING"|"SUMMER"|"FALL"|"WINTER"|"">("");

  // Technique filter state
  const [availableTechniques, setAvailableTechniques] = useState<{ id: string; name: string; comfort: number }[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Generate state
  const [generatedRecipes, setGeneratedRecipes] = useState<GeneratedRecipe[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [savingIdx, setSavingIdx] = useState<Set<number>>(new Set());
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const [savedRecipeIds, setSavedRecipeIds] = useState<Record<number, string>>({});
  const generateResultsRef = useRef<HTMLDivElement>(null);

  // Cook log form state
  const [logForm, setLogForm] = useState<LogForm>(null);
  const [logRating, setLogRating] = useState(4);
  const [logNotes, setLogNotes] = useState("");
  const [logWouldRepeat, setLogWouldRepeat] = useState(true);
  const [logSaving, setLogSaving] = useState(false);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);
  const [logMatches, setLogMatches] = useState<LogInventoryMatch[]>([]);
  const [logLoadingInventory, setLogLoadingInventory] = useState(false);

  // Fetch user preferences and available techniques on mount
  useEffect(() => {
    fetch("/api/preferences")
      .then(res => res.json())
      .then(data => {
        if (data.equipment?.length) setEquipment(data.equipment.join(","));
        if (data.defaultMaxTimeMin) setMaxTotalMin(data.defaultMaxTimeMin);
        if (data.defaultServings) setServings(data.defaultServings);
        if (data.dietaryTagsExclude?.length) setTagsExclude(data.dietaryTagsExclude.join(","));
        if (data.defaultComplexity && data.defaultComplexity !== "ANY") setComplexity(data.defaultComplexity);
        if (typeof data.wantVariety === "boolean") setWantVariety(data.wantVariety);
        if (typeof data.wantGrowth === "boolean") setWantGrowth(data.wantGrowth);
      })
      .catch(() => {});
    fetch("/api/techniques")
      .then(res => res.json())
      .then(data => setAvailableTechniques(data.techniques ?? []))
      .catch(() => {});
  }, []);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        servings,
        maxTotalMin,
        occasion,
        equipment: equipment.split(",").map(s=>s.trim()).filter(Boolean),
        mustUse: mustUse ? mustUse.split(",").map(s=>s.trim()).filter(Boolean) : undefined,
        tagsInclude: tagsInclude ? tagsInclude.split(",").map(s=>s.trim()).filter(Boolean) : undefined,
        tagsExclude: tagsExclude ? tagsExclude.split(",").map(s=>s.trim()).filter(Boolean) : undefined,
        cuisine: cuisine || undefined,
        wantVariety,
        wantGrowth,
        complexity: complexity !== "ANY" ? complexity : undefined,
        season: season || undefined,
        techniques: selectedTechniques.length > 0 ? selectedTechniques : undefined
      })
    });
    const data = await res.json();
    setResults(data.results ?? []);
    setHasSearched(true);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    setGenerateError(null);
    setGeneratedRecipes([]);
    setSavedIdx(new Set());
    setSavedRecipeIds({});
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          maxTotalMin,
          equipment: equipment.split(",").map(s => s.trim()).filter(Boolean),
          cuisine: cuisine || undefined,
          complexity: complexity !== "ANY" ? complexity : undefined,
          mustUse: mustUse ? mustUse.split(",").map(s => s.trim()).filter(Boolean) : undefined,
          mealType: occasion !== "ANY" ? occasion : undefined,
          count: 3
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error ?? "Generation failed");
      } else {
        setGeneratedRecipes(data.recipes ?? []);
        setTimeout(() => generateResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    } catch {
      setGenerateError("Network error — check that the server is running.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveGenerated(recipe: GeneratedRecipe, idx: number) {
    setSavingIdx(prev => new Set(prev).add(idx));
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...recipe,
          source: "PERSONAL",
          complexity: recipe.complexity ?? "FAMILIAR"
        })
      });
      if (res.ok) {
        const data = await res.json();
        const savedId: string | undefined = data.recipe?.id;
        setSavedIdx(prev => new Set(prev).add(idx));
        if (savedId) setSavedRecipeIds(prev => ({ ...prev, [idx]: savedId }));
        setSaveToast(`"${recipe.title}" saved to your recipes`);
        setTimeout(() => setSaveToast(null), 3500);
      }
    } finally {
      setSavingIdx(prev => { const s = new Set(prev); s.delete(idx); return s; });
    }
  }

  function toggleTechnique(name: string) {
    setSelectedTechniques(prev =>
      prev.includes(name)
        ? prev.filter(t => t !== name)
        : [...prev, name]
    );
  }

  async function openLogForm(recipeId: string, title: string, haveList: string[]) {
    setLogForm({ recipeId, title });
    setLogRating(4);
    setLogNotes("");
    setLogWouldRepeat(true);
    setLogSuccess(null);
    setLogMatches([]);
    setLogLoadingInventory(true);
    try {
      const res = await fetch("/api/inventory/items");
      const data = await res.json();
      type RawItem = { id: string; name: string; category: string; location: string; batches: { id: string; quantityText: string }[] };
      const items: RawItem[] = data.items ?? [];
      const byName = new Map(items.map(it => [normName(it.name), it]));

      const matches: LogInventoryMatch[] = [];
      for (const have of haveList) {
        // Strip swap annotation e.g. "olive oil (swap: vegetable oil)"
        const ingredientName = have.replace(/\s*\(swap:.*\)$/i, "").trim();
        const item = byName.get(normName(ingredientName));
        if (!item) continue;
        const batch = item.batches[0] ?? null;
        matches.push({
          itemId: item.id,
          batchId: batch?.id ?? null,
          itemName: item.name,
          category: item.category,
          location: item.location,
          currentQty: batch?.quantityText ?? "—",
          action: "skip",
          newQty: batch?.quantityText ?? ""
        });
      }
      setLogMatches(matches);
    } catch {
      // Non-fatal — inventory section will just be empty
    } finally {
      setLogLoadingInventory(false);
    }
  }

  function updateLogMatch(idx: number, patch: Partial<LogInventoryMatch>) {
    setLogMatches(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m));
  }

  async function submitLog() {
    if (!logForm) return;
    setLogSaving(true);
    try {
      const res = await fetch("/api/cooklogs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipeId: logForm.recipeId,
          rating: logRating,
          notes: logNotes || undefined,
          wouldRepeat: logWouldRepeat
        })
      });
      if (!res.ok) return;

      // Process inventory deductions
      for (const m of logMatches) {
        if (m.action === "remove") {
          await fetch(`/api/inventory/items?id=${m.itemId}`, { method: "DELETE" });
        } else if (m.action === "update" && m.newQty.trim()) {
          await fetch("/api/inventory/items", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              id: m.itemId,
              item: { name: m.itemName, category: m.category, location: m.location },
              batch: { id: m.batchId ?? undefined, quantityText: m.newQty.trim() }
            })
          });
        }
      }

      const removed = logMatches.filter(m => m.action === "remove").length;
      const updated = logMatches.filter(m => m.action === "update").length;
      const suffix = removed + updated > 0
        ? ` · ${removed > 0 ? `${removed} removed` : ""}${removed > 0 && updated > 0 ? ", " : ""}${updated > 0 ? `${updated} updated` : ""} from inventory`
        : "";

      setLogSuccess(logForm.title + suffix);
      setLogForm(null);
      setLogMatches([]);
      setTimeout(() => setLogSuccess(null), 4000);
    } finally {
      setLogSaving(false);
    }
  }

  function renderLogForm() {
    return (
      <div style={{marginTop:12, padding:12, background:"rgba(127,127,127,0.1)", borderRadius:8}}>
        <div style={{marginBottom:10}}>
          <label style={{display:"block", marginBottom:4, fontSize:13}}>Rating</label>
          <div style={{display:"flex", gap:4}}>
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                onClick={() => setLogRating(n)}
                style={{
                  padding:"4px 10px",
                  background: n <= logRating ? "rgba(255,180,0,0.3)" : "transparent",
                  border: "1px solid rgba(127,127,127,0.3)",
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                {"★"}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <label style={{display:"block", marginBottom:4, fontSize:13}}>Notes (optional)</label>
          <textarea
            value={logNotes}
            onChange={e => setLogNotes(e.target.value)}
            placeholder="How did it turn out?"
            rows={2}
            style={{width:"100%", resize:"vertical"}}
          />
        </div>
        <div style={{marginBottom:10}}>
          <label style={{display:"flex", alignItems:"center", gap:6, fontSize:13}}>
            <input
              type="checkbox"
              checked={logWouldRepeat}
              onChange={e => setLogWouldRepeat(e.target.checked)}
            />
            Would make again
          </label>
        </div>
        <div style={{marginBottom:10}}>
          <p style={{margin:"0 0 6px 0", fontSize:13, fontWeight:500}}>Update inventory</p>
          {logLoadingInventory ? (
            <p style={{fontSize:12, opacity:0.5}}>Loading inventory...</p>
          ) : logMatches.length === 0 ? (
            <p style={{fontSize:12, opacity:0.5}}>No inventory items matched this recipe.</p>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:6}}>
              {logMatches.map((m, i) => (
                <div key={m.itemId} style={{display:"flex", flexWrap:"wrap", alignItems:"center", gap:6, fontSize:13}}>
                  <span style={{flex:"1 1 120px", minWidth:100}}>{m.itemName}</span>
                  <span style={{opacity:0.5, fontSize:12, whiteSpace:"nowrap"}}>({m.currentQty})</span>
                  <select
                    value={m.action}
                    onChange={e => updateLogMatch(i, { action: e.target.value as LogInventoryMatch["action"] })}
                    style={{fontSize:12}}
                  >
                    <option value="skip">Keep as is</option>
                    <option value="remove">Used it all — remove</option>
                    <option value="update">Update quantity</option>
                  </select>
                  {m.action === "update" && (
                    <input
                      value={m.newQty}
                      onChange={e => updateLogMatch(i, { newQty: e.target.value })}
                      placeholder="new qty..."
                      style={{width:110, fontSize:12}}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="row">
          <button onClick={submitLog} disabled={logSaving} style={{padding:"6px 16px"}}>
            {logSaving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => setLogForm(null)} style={{padding:"6px 12px"}}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h3>What are you looking for?</h3>
        <div className="row">
          <label>Servings <input type="number" value={servings} onChange={e=>setServings(parseInt(e.target.value||"2",10))} style={{maxWidth:70}}/></label>
          <label>Max minutes <input type="number" value={maxTotalMin} onChange={e=>setMaxTotalMin(parseInt(e.target.value||"45",10))} style={{maxWidth:80}}/></label>
          <label>Meal type
            <select value={occasion} onChange={e=>setOccasion(e.target.value as any)}>
              <option value="ANY">Any</option>
              <optgroup label="Meal">
                <option value="BREAKFAST">Breakfast</option>
                <option value="LUNCH">Lunch</option>
                <option value="DINNER">Dinner</option>
                <option value="SNACK">Snack</option>
              </optgroup>
              <optgroup label="Context">
                <option value="WEEKNIGHT">Weeknight</option>
                <option value="POTLUCK">Potluck</option>
                <option value="MEAL_PREP">Meal Prep</option>
              </optgroup>
            </select>
          </label>
          <label>Complexity
            <select value={complexity} onChange={e=>setComplexity(e.target.value as any)}>
              <option value="ANY">Any</option>
              <option value="FAMILIAR">Familiar</option>
              <option value="STRETCH">Stretch</option>
              <option value="CHALLENGE">Challenge</option>
            </select>
          </label>
        </div>
        
        <div className="row" style={{marginTop:10}}>
          <label>Cuisine <input value={cuisine} onChange={e=>setCuisine(e.target.value)} placeholder="e.g. Mexican, Italian" style={{minWidth:160}}/></label>
          <label>Season
            <select value={season} onChange={e=>setSeason(e.target.value as any)}>
              <option value="">Any</option>
              <option value="SPRING">Spring</option>
              <option value="SUMMER">Summer</option>
              <option value="FALL">Fall</option>
              <option value="WINTER">Winter</option>
            </select>
          </label>
        </div>

        <div className="row" style={{marginTop:10}}>
          <label style={{display:"flex", alignItems:"center", gap:6}}>
            <input type="checkbox" checked={wantVariety} onChange={e=>setWantVariety(e.target.checked)} />
            Boost variety (cuisines I haven&apos;t had lately)
          </label>
          <label style={{display:"flex", alignItems:"center", gap:6}}>
            <input type="checkbox" checked={wantGrowth} onChange={e=>setWantGrowth(e.target.checked)} />
            Help me grow (suggest new techniques)
          </label>
        </div>

        {availableTechniques.length > 0 && (
          <div style={{marginTop:12}}>
            <label style={{display:"block", marginBottom:6, fontSize:14}}>
              Practice techniques {selectedTechniques.length > 0 && <small className="muted">({selectedTechniques.length} selected)</small>}
            </label>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {availableTechniques.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTechnique(t.name)}
                  style={{
                    padding: "4px 10px",
                    fontSize: 12,
                    borderRadius: 12,
                    background: selectedTechniques.includes(t.name) ? "rgba(100,150,255,0.3)" : "rgba(127,127,127,0.1)",
                    border: selectedTechniques.includes(t.name) ? "1px solid rgba(100,150,255,0.5)" : "1px solid transparent",
                    cursor: "pointer"
                  }}
                >
                  {t.name}
                  {t.comfort > 0 && <span style={{marginLeft:4, opacity:0.6}}>{"★".repeat(t.comfort)}</span>}
                </button>
              ))}
            </div>
            {selectedTechniques.length > 0 && (
              <button
                onClick={() => setSelectedTechniques([])}
                style={{marginTop:6, padding:"2px 8px", fontSize:12, color:"#888"}}
              >
                Clear techniques
              </button>
            )}
          </div>
        )}

        <details style={{marginTop:12}}>
          <summary style={{cursor:"pointer"}}>More filters</summary>
          <div className="row" style={{marginTop:8}}>
            <input value={equipment} onChange={e=>setEquipment(e.target.value)} placeholder="Equipment (comma-separated)" style={{minWidth:260}}/>
            <input value={mustUse} onChange={e=>setMustUse(e.target.value)} placeholder="Must-use items (comma-separated)" style={{minWidth:260}}/>
          </div>
          <div className="row" style={{marginTop:8}}>
            <input value={tagsInclude} onChange={e=>setTagsInclude(e.target.value)} placeholder="Include tags (comma-separated)" style={{minWidth:260}}/>
            <input value={tagsExclude} onChange={e=>setTagsExclude(e.target.value)} placeholder="Exclude tags (comma-separated)" style={{minWidth:260}}/>
          </div>
        </details>

        <div style={{marginTop:12}}>
          <button onClick={run} disabled={loading} style={{padding:"10px 24px", fontWeight:500}}>
            {loading ? "Finding recipes..." : "🍳 Find Recipes"}
          </button>
          <p style={{margin:"6px 0 0", fontSize:12, opacity:0.5}}>
            Searches and ranks recipes already saved in your library. No AI — instant.
          </p>
        </div>
      </div>

      <div style={{display:"flex", alignItems:"center", gap:12, margin:"4px 0", opacity:0.35}}>
        <div style={{flex:1, height:1, background:"currentColor"}} />
        <span style={{fontSize:13, fontWeight:500}}>or</span>
        <div style={{flex:1, height:1, background:"currentColor"}} />
      </div>

      {/* ── Generate new recipes via Claude ─────────────────────── */}
      <div className="card" style={{marginTop:16}}>
        <h3 style={{margin:"0 0 4px 0"}}>✨ Generate new recipes with AI</h3>
        <p style={{margin:"0 0 12px 0", opacity:0.65, fontSize:14}}>
          These recipes <strong>don&apos;t exist in your library yet</strong> — Claude invents them based on your current inventory.
          Save the ones you like and they&apos;ll appear in Find Recipes going forward.
          Uses your filters above. Costs a small amount of API credit per generation.
        </p>
        <div className="row">
          <button
            onClick={generate}
            disabled={generating}
            style={{padding:"10px 24px", fontWeight:500, background:"rgba(100,150,255,0.15)", border:"1px solid rgba(100,150,255,0.4)"}}
          >
            {generating ? "Generating..." : "✨ Generate Recipe Ideas"}
          </button>
          {generatedRecipes.length > 0 && !generating && (
            <button
              onClick={() => { setGeneratedRecipes([]); setSavedIdx(new Set()); setSavedRecipeIds({}); }}
              style={{padding:"10px 14px", opacity:0.6}}
            >
              Clear
            </button>
          )}
        </div>
        {generateError && (
          <p style={{marginTop:10, color:"#f87171", fontSize:14}}>{generateError}</p>
        )}
      </div>

      {generatedRecipes.length > 0 && (
        <div ref={generateResultsRef}>
          <p style={{margin:"16px 0 8px", opacity:0.7}}>
            {generatedRecipes.length} generated {generatedRecipes.length === 1 ? "recipe" : "recipes"} — save the ones you like:
          </p>
          {generatedRecipes.map((r, idx) => (
            <div key={idx} className="card" style={{borderLeft:"3px solid rgba(100,150,255,0.4)"}}>
              <div className="row" style={{justifyContent:"space-between", alignItems:"flex-start"}}>
                <div>
                  <h3 style={{margin:"0 0 4px 0"}}>{r.title}</h3>
                  <small className="muted">
                    {r.totalMin}min total · {r.handsOnMin}min hands-on · serves {r.servings}{r.servingsMax ? `–${r.servingsMax}` : ""}
                  </small>
                  <div style={{marginTop:4}}>
                    {r.cuisine && <span className="tag">{r.cuisine}</span>}
                    {r.complexity && <span className="tag">{r.complexity.toLowerCase()}</span>}
                    {r.techniques?.map(t => <span key={t} className="tag tech">{t}</span>)}
                  </div>
                </div>
                <button
                  onClick={() => saveGenerated(r, idx)}
                  disabled={savingIdx.has(idx) || savedIdx.has(idx)}
                  style={{
                    padding:"6px 14px",
                    fontSize:13,
                    background: savedIdx.has(idx) ? "rgba(100,200,100,0.2)" : undefined,
                    border: savedIdx.has(idx) ? "1px solid rgba(100,200,100,0.4)" : undefined
                  }}
                >
                  {savingIdx.has(idx) ? "Saving..." : savedIdx.has(idx) ? "✓ Saved" : "Save to My Recipes"}
                </button>
              </div>

              {savedIdx.has(idx) && savedRecipeIds[idx] && (
                <button
                  onClick={() => openLogForm(savedRecipeIds[idx], r.title, r.ingredients.map(i => i.name))}
                  style={{padding:"6px 12px", fontSize:13, marginTop:6}}
                >
                  I Made This
                </button>
              )}

              {logForm?.recipeId === savedRecipeIds[idx] && renderLogForm()}

              {r.reasoning && (
                <p style={{margin:"8px 0 0", fontSize:13, opacity:0.65, fontStyle:"italic"}}>
                  {r.reasoning}
                </p>
              )}

              <div className="row" style={{marginTop:12, alignItems:"flex-start"}}>
                <div style={{flex:1, minWidth:220}}>
                  <h4 style={{margin:"0 0 6px 0", fontSize:14}}>Ingredients</h4>
                  <ul style={{margin:0, paddingLeft:20}}>
                    {r.ingredients.map((ing, i) => (
                      <li key={i} style={{fontSize:13, opacity: ing.required ? 1 : 0.7}}>
                        {ing.quantityText ? `${ing.quantityText} ` : ""}
                        {ing.name}
                        {ing.preparation ? `, ${ing.preparation}` : ""}
                        {!ing.required && <span className="muted"> (optional)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{flex:2, minWidth:280}}>
                  <h4 style={{margin:"0 0 6px 0", fontSize:14}}>Instructions</h4>
                  <ol style={{margin:0, paddingLeft:20}}>
                    {r.instructions.split(/\n+/).filter(s => s.trim()).map((step, i) => (
                      <li key={i} style={{fontSize:13, marginBottom:4}}>
                        {step.replace(/^\d+\.\s*/, "")}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {saveToast && (
        <div className="card" style={{background:"rgba(100,200,100,0.15)", marginTop:16, position:"sticky", top:60, zIndex:50}}>
          ✓ {saveToast}
        </div>
      )}

      {logSuccess && (
        <div className="card" style={{background:"rgba(100,200,100,0.15)", marginTop:16}}>
          Logged &quot;{logSuccess}&quot; to your cook history!
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && (
        <div className="empty-state" style={{opacity:1}}>
          <div className="empty-state-icon">📭</div>
          <h3>No recipes in your library yet</h3>
          <p style={{opacity:0.7}}>
            Use <strong>Generate Recipe Ideas</strong> below to create some, then save the ones you like.
            Once saved, they&apos;ll appear here ranked by how well they match your inventory.
          </p>
          <p style={{opacity:0.5, fontSize:13, marginTop:8}}>
            The <strong>I Made This</strong> button appears on each result card here — that&apos;s where inventory deductions happen.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <p style={{margin:"16px 0 8px", opacity:0.7}}>
          Found {results.length} recipes ranked by fit:
        </p>
      )}

      {results.map((r, idx) => (
        <div key={r.recipeId} className="card">
          <div className="row" style={{justifyContent:"space-between", alignItems:"flex-start"}}>
            <div>
              <h3 style={{margin:"0 0 4px 0"}}>
                {idx === 0 && "🏆 "}{r.title}
              </h3>
              <small className="muted">
                Score: {r.score} • {r.why.join(" • ")}
              </small>
              {(r.cuisine || r.complexity || r.techniques?.length || (r.costPerServing != null && r.costPerServing > 0)) && (
                <div style={{marginTop:4}}>
                  {r.cuisine && <span className="tag">{r.cuisine}</span>}
                  {r.complexity && <span className="tag">{r.complexity.toLowerCase()}</span>}
                  {r.techniques?.map(t => <span key={t} className="tag tech">{t}</span>)}
                  {r.costPerServing != null && r.costPerServing > 0 && (
                    <span className="tag cost">~${(r.costPerServing / 100).toFixed(2)}/serving</span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => openLogForm(r.recipeId, r.title, r.have)}
              style={{padding:"6px 12px", fontSize:13}}
            >
              I Made This
            </button>
          </div>

          {logForm?.recipeId === r.recipeId && renderLogForm()}

          <div className="row" style={{marginTop:10}}>
            <div style={{flex:1, minWidth:260}}>
              <h4 style={{margin:"0 0 6px 0", fontSize:14}}>✓ Have</h4>
              {r.have.length > 0 ? (
                <ul style={{margin:0, paddingLeft:20}}>{r.have.map((x, i) => <li key={i}>{x}</li>)}</ul>
              ) : (
                <small className="muted">—</small>
              )}
            </div>
            <div style={{flex:1, minWidth:260}}>
              <h4 style={{margin:"0 0 6px 0", fontSize:14}}>✗ Missing</h4>
              {r.missing.length ? (
                <ul style={{margin:0, paddingLeft:20}}>
                  {r.missing.map((x, i) => (
                    <li key={i}>
                      {x}
                      {r.swaps[x]?.length ? <small className="muted"> (swaps: {r.swaps[x].join(", ")})</small> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <small className="muted">Nothing required missing!</small>
              )}
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        .tag {
          display: inline-block;
          padding: 2px 8px;
          margin-right: 6px;
          border-radius: 12px;
          font-size: 12px;
          background: rgba(127,127,127,0.15);
        }
        .tag.tech {
          background: rgba(100,150,255,0.2);
        }
        .tag.cost {
          background: rgba(100,200,100,0.2);
        }
      `}</style>
    </>
  );
}
