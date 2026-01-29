"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmModal, Toast } from "@/app/components/Modal";

type Recipe = {
  id: string;
  title: string;
  servings: number;
  servingsMax: number | null;
  handsOnMin: number;
  totalMin: number;
  difficulty: number;
  equipment: string[];
  tags: string[];
  seasons: string[];
  instructions: string;
  source: string;
  sourceRef: string | null;
  cuisine: string | null;
  complexity: string;
  ingredients: { id: string; name: string; required: boolean; quantityText: string | null; preparation: string | null; substitutions: string[] }[];
  cookLogs: { id: string; rating: number; cookedOn: string; notes: string | null }[];
  techniques: { technique: { id: string; name: string } }[];
};

const sources = ["PERSONAL", "FAMILY", "WEB", "COOKBOOK", "FRIEND"];
const complexities = ["FAMILIAR", "STRETCH", "CHALLENGE"];

type RecipesClientProps = {
  initialSearch?: string;
};

export default function RecipesClient({ initialSearch }: RecipesClientProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [servings, setServings] = useState(2);
  const [servingsMax, setServingsMax] = useState<number | "">("");
  const [totalMin, setTotalMin] = useState(30);
  const [handsOnMin, setHandsOnMin] = useState(15);
  const [difficulty, setDifficulty] = useState(2);
  const [equipment, setEquipment] = useState("STOVETOP");
  const [tags, setTags] = useState("WEEKNIGHT");
  const [seasons, setSeasons] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  
  // New fields
  const [source, setSource] = useState("PERSONAL");
  const [sourceRef, setSourceRef] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [complexity, setComplexity] = useState("FAMILIAR");
  const [techniques, setTechniques] = useState("");

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [filterCuisine, setFilterCuisine] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<number | "">("");
  const [filterComplexity, setFilterComplexity] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterTag, setFilterTag] = useState("");

  // UI collapse state
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showImport, setShowImport] = useState(false);

  // URL import state
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importedRecipe, setImportedRecipe] = useState<{
    title: string;
    servings: number;
    totalMin: number;
    handsOnMin: number;
    ingredients: { name: string; quantityText: string | null }[];
    instructions: string;
    cuisine: string | null;
    source: string;
    sourceRef: string;
  } | null>(null);

  // Modal and toast state
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [saving, setSaving] = useState(false);

  // Expansion state - tracks which recipes are expanded (all collapsed by default)
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());

  function toggleExpanded(recipeId: string) {
    setExpandedRecipes(prev => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
        // Fetch cost when expanding
        fetchRecipeCost(recipeId);
      }
      return next;
    });
  }

  function expandAll() {
    const allIds = recipes.map(r => r.id);
    setExpandedRecipes(new Set(allIds));
    // Fetch costs for all
    allIds.forEach(id => fetchRecipeCost(id));
  }

  function collapseAll() {
    setExpandedRecipes(new Set());
  }

  // Recipe scaling state - tracks desired servings per recipe
  const [scaledServings, setScaledServings] = useState<Record<string, number>>({});

  // Recipe cost state
  const [recipeCosts, setRecipeCosts] = useState<Record<string, {
    totalCents: number;
    costPerServing: number | null;
    matchedCount: number;
    totalIngredients: number;
    complete: boolean;
  } | null>>({});

  async function fetchRecipeCost(recipeId: string) {
    if (recipeCosts[recipeId] !== undefined) return; // Already fetched or loading
    setRecipeCosts(prev => ({ ...prev, [recipeId]: null })); // Mark as loading
    try {
      const res = await fetch(`/api/recipes/${recipeId}/cost`);
      const data = await res.json();
      setRecipeCosts(prev => ({
        ...prev,
        [recipeId]: {
          totalCents: data.totalCents,
          costPerServing: data.costPerServing,
          matchedCount: data.matchedCount,
          totalIngredients: data.totalIngredients,
          complete: data.complete
        }
      }));
    } catch {
      // Failed to fetch cost, leave as null
    }
  }

  function formatCost(cents: number | null | undefined): string {
    if (cents == null) return "—";
    return `$${(cents / 100).toFixed(2)}`;
  }

  function getScaledServings(r: Recipe): number {
    return scaledServings[r.id] ?? r.servings;
  }

  function setRecipeServings(recipeId: string, servings: number) {
    setScaledServings(prev => ({ ...prev, [recipeId]: servings }));
  }

  // Scale a quantity string by a ratio (e.g., "2 cups" with ratio 1.5 -> "3 cups")
  function scaleQuantity(quantityText: string | null, ratio: number): string | null {
    if (!quantityText || ratio === 1) return quantityText;

    // Match leading number (including fractions like 1/2, decimals like 1.5)
    const match = quantityText.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(.*)$/);
    if (!match) return quantityText;

    let num: number;
    const numStr = match[1];
    const rest = match[2];

    // Handle fractions like "1/2"
    if (numStr.includes("/")) {
      const [numer, denom] = numStr.split("/").map(Number);
      num = numer / denom;
    } else {
      num = parseFloat(numStr);
    }

    const scaled = num * ratio;

    // Format nicely: avoid too many decimals
    let formatted: string;
    if (scaled === Math.floor(scaled)) {
      formatted = scaled.toString();
    } else if (scaled * 4 === Math.floor(scaled * 4)) {
      // Can express as quarter fraction
      const whole = Math.floor(scaled);
      const frac = scaled - whole;
      if (frac === 0.25) formatted = whole ? `${whole} 1/4` : "1/4";
      else if (frac === 0.5) formatted = whole ? `${whole} 1/2` : "1/2";
      else if (frac === 0.75) formatted = whole ? `${whole} 3/4` : "3/4";
      else formatted = scaled.toFixed(2).replace(/\.?0+$/, "");
    } else {
      formatted = scaled.toFixed(2).replace(/\.?0+$/, "");
    }

    return rest ? `${formatted} ${rest}` : formatted;
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/recipes");
      if (!res.ok) throw new Error("Failed to load recipes");
      const data = await res.json();
      setRecipes(data.recipes);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to load recipes", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function parseIngredients(txt: string) {
    return txt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const req = /\(required\)/i.test(line);
        const opt = /\(optional\)/i.test(line);
        let clean = line.replace(/\((required|optional)\)/ig, "").trim();
        
        // Parse preparation if in brackets [diced]
        let preparation: string | undefined;
        const prepMatch = clean.match(/\[([^\]]+)\]/);
        if (prepMatch) {
          preparation = prepMatch[1];
          clean = clean.replace(/\[[^\]]+\]/, "").trim();
        }
        
        return { 
          name: clean, 
          required: opt ? false : req ? true : true, 
          preparation,
          substitutions: [] as string[] 
        };
      });
  }

  async function addRecipe() {
    if (!title.trim() || !ingredientsText.trim()) return;
    setSaving(true);

    try {
      const recipeData = {
        title,
        servings,
        servingsMax: servingsMax || undefined,
        totalMin,
        handsOnMin,
        difficulty,
        equipment: equipment.split(",").map(s=>s.trim()).filter(Boolean),
        tags: tags.split(",").map(s=>s.trim()).filter(Boolean),
        seasons: seasons ? seasons.split(",").map(s=>s.trim()).filter(Boolean) : [],
        instructions,
        ingredients: parseIngredients(ingredientsText),
        source,
        sourceRef: sourceRef || undefined,
        cuisine: cuisine || undefined,
        complexity,
        techniques: techniques ? techniques.split(",").map(s=>s.trim()).filter(Boolean) : []
      };

      const res = editingId
        ? await fetch("/api/recipes", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: editingId, ...recipeData })
          })
        : await fetch("/api/recipes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(recipeData)
          });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.fieldErrors?.title?.[0] || "Failed to save recipe");
      }

      setToast({ message: editingId ? "Recipe updated" : "Recipe saved", type: "success" });
      cancelEdit();
      await refresh();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to save recipe", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setServings(2);
    setServingsMax("");
    setTotalMin(30);
    setHandsOnMin(15);
    setDifficulty(2);
    setEquipment("STOVETOP");
    setTags("WEEKNIGHT");
    setSeasons("");
    setInstructions("");
    setIngredientsText("");
    setSource("PERSONAL");
    setSourceRef("");
    setCuisine("");
    setComplexity("FAMILIAR");
    setTechniques("");
  }

  // Extract unique values for filter dropdowns
  const allCuisines = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => r.cuisine && set.add(r.cuisine));
    return Array.from(set).sort();
  }, [recipes]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => r.tags?.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [recipes]);

  // Apply filters
  const filtered = useMemo(() => {
    return recipes.filter(r => {
      if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCuisine && r.cuisine !== filterCuisine) return false;
      if (filterDifficulty !== "" && r.difficulty !== filterDifficulty) return false;
      if (filterComplexity && r.complexity !== filterComplexity) return false;
      if (filterSource && r.source !== filterSource) return false;
      if (filterTag && !r.tags?.includes(filterTag)) return false;
      return true;
    });
  }, [recipes, searchQuery, filterCuisine, filterDifficulty, filterComplexity, filterSource, filterTag]);

  const sorted = useMemo(() => filtered.slice().sort((a,b)=>a.title.localeCompare(b.title)), [filtered]);

  const hasFilters = searchQuery || filterCuisine || filterDifficulty !== "" || filterComplexity || filterSource || filterTag;

  function clearFilters() {
    setSearchQuery("");
    setFilterCuisine("");
    setFilterDifficulty("");
    setFilterComplexity("");
    setFilterSource("");
    setFilterTag("");
  }

  function promptDelete(id: string, recipeTitle: string) {
    setDeleteModal({ id, title: recipeTitle });
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/recipes?id=${deleteModal.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete recipe");

      setToast({ message: `"${deleteModal.title}" deleted`, type: "success" });
      setDeleteModal(null);
      await refresh();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to delete", type: "error" });
    } finally {
      setDeleting(false);
    }
  }

  function editRecipe(r: Recipe) {
    setEditingId(r.id);
    setTitle(r.title);
    setServings(r.servings);
    setServingsMax(r.servingsMax ?? "");
    setTotalMin(r.totalMin);
    setHandsOnMin(r.handsOnMin);
    setDifficulty(r.difficulty);
    setEquipment(r.equipment?.join(", ") || "");
    setTags(r.tags?.join(", ") || "");
    setSeasons(r.seasons?.join(", ") || "");
    setInstructions(r.instructions || "");
    setCuisine(r.cuisine || "");
    setSource(r.source);
    setSourceRef(r.sourceRef || "");
    setComplexity(r.complexity);
    setTechniques(r.techniques?.map(t => t.technique.name).join(", ") || "");
    // Format ingredients back to text
    const ingText = r.ingredients.map(i => {
      let line = i.quantityText ? `${i.quantityText} ` : "";
      line += i.name;
      if (i.preparation) line += ` [${i.preparation}]`;
      line += i.required ? " (required)" : " (optional)";
      return line;
    }).join("\n");
    setIngredientsText(ingText);
    // Scroll to top of form and open the form
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function fetchRecipeFromUrl() {
    if (!importUrl.trim()) return;

    setImportLoading(true);
    setImportError("");
    setImportedRecipe(null);

    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: importUrl })
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || "Failed to import recipe");
        return;
      }

      setImportedRecipe(data.recipe);
    } catch {
      setImportError("Failed to fetch recipe. Check the URL and try again.");
    } finally {
      setImportLoading(false);
    }
  }

  function useImportedRecipe() {
    if (!importedRecipe) return;

    // Populate the Add Recipe form with imported data
    setTitle(importedRecipe.title);
    setServings(importedRecipe.servings);
    setTotalMin(importedRecipe.totalMin);
    setHandsOnMin(importedRecipe.handsOnMin);
    setInstructions(importedRecipe.instructions);
    setCuisine(importedRecipe.cuisine || "");
    setSource("WEB");
    setSourceRef(importedRecipe.sourceRef);

    // Format ingredients
    const ingText = importedRecipe.ingredients
      .map(i => i.quantityText ? `${i.quantityText} ${i.name}` : i.name)
      .join("\n");
    setIngredientsText(ingText);

    // Clear import state and open add form
    setImportedRecipe(null);
    setImportUrl("");
    setShowImport(false);
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearImport() {
    setImportUrl("");
    setImportError("");
    setImportedRecipe(null);
  }

  return (
    <>
      {/* Import from URL */}
      <div className="card">
        <h3
          className="collapsible-header"
          onClick={() => setShowImport(!showImport)}
        >
          <span className={`collapse-icon ${showImport ? "open" : ""}`}>▶</span>
          Import from URL
        </h3>

        {showImport && (
          <div style={{ marginTop: 12 }}>
            <div className="row">
              <input
                type="url"
                placeholder="Paste recipe URL (e.g., https://example.com/recipe)"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                style={{ flex: 1, minWidth: 250 }}
              />
              <button onClick={fetchRecipeFromUrl} disabled={importLoading || !importUrl.trim()}>
                {importLoading ? "Importing..." : "Fetch Recipe"}
              </button>
            </div>
            <p style={{ marginTop: 4 }}>
              <small className="muted">Works with most recipe sites that use structured data (AllRecipes, Food Network, etc.)</small>
            </p>

            {importError && (
              <div style={{ marginTop: 12, padding: 12, background: "rgba(200,50,50,0.1)", borderRadius: 8 }}>
                <strong style={{ color: "#c44" }}>Error:</strong> {importError}
              </div>
            )}

            {importedRecipe && (
              <div style={{ marginTop: 12, padding: 12, background: "rgba(100,180,100,0.1)", borderRadius: 8 }}>
                <h4 style={{ margin: "0 0 8px 0" }}>Preview: {importedRecipe.title}</h4>
                <div className="row" style={{ marginBottom: 8 }}>
                  <small className="muted">{importedRecipe.totalMin}m total</small>
                  <small className="muted">{importedRecipe.handsOnMin}m hands-on</small>
                  <small className="muted">Serves {importedRecipe.servings}</small>
                  {importedRecipe.cuisine && <small className="muted">{importedRecipe.cuisine}</small>}
                </div>
                <details style={{ marginBottom: 8 }}>
                  <summary style={{ cursor: "pointer", fontSize: 14 }}>
                    {importedRecipe.ingredients.length} ingredients
                  </summary>
                  <ul style={{ margin: "8px 0", paddingLeft: 20, fontSize: 14 }}>
                    {importedRecipe.ingredients.slice(0, 10).map((ing, i) => (
                      <li key={i}>{ing.quantityText ? `${ing.quantityText} ` : ""}{ing.name}</li>
                    ))}
                    {importedRecipe.ingredients.length > 10 && (
                      <li className="muted">...and {importedRecipe.ingredients.length - 10} more</li>
                    )}
                  </ul>
                </details>
                <div className="row">
                  <button onClick={useImportedRecipe}>Use This Recipe</button>
                  <button onClick={clearImport} style={{ color: "#888" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Recipe Form */}
      <div className="card" style={editingId ? { border: "2px solid var(--accent, #4a9eff)" } : undefined}>
        <h3
          className="collapsible-header"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <span className={`collapse-icon ${showAddForm ? "open" : ""}`}>▶</span>
          {editingId ? "Edit Recipe" : "Add Recipe"}
        </h3>

        {showAddForm && (
          <>
            <div className="row" style={{marginTop:12}}>
              <input placeholder="Title *" value={title} onChange={e=>setTitle(e.target.value)} style={{minWidth:280}}/>
              <input placeholder="Cuisine (e.g. Mexican)" value={cuisine} onChange={e=>setCuisine(e.target.value)} style={{minWidth:160}}/>
            </div>

            <div className="row" style={{marginTop:8}}>
              <label>Servings <input type="number" value={servings} onChange={e=>setServings(parseInt(e.target.value||"2",10))} style={{maxWidth:60}}/></label>
              <label>Max (scalable) <input type="number" value={servingsMax} onChange={e=>setServingsMax(e.target.value ? parseInt(e.target.value,10) : "")} style={{maxWidth:60}} placeholder="—"/></label>
              <label>Hands-on <input type="number" value={handsOnMin} onChange={e=>setHandsOnMin(parseInt(e.target.value||"15",10))} style={{maxWidth:60}}/> min</label>
              <label>Total <input type="number" value={totalMin} onChange={e=>setTotalMin(parseInt(e.target.value||"30",10))} style={{maxWidth:60}}/> min</label>
              <label>Difficulty
                <select value={difficulty} onChange={e=>setDifficulty(parseInt(e.target.value))}>
                  {[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>

            <div className="row" style={{marginTop:8}}>
              <label>Source
                <select value={source} onChange={e=>setSource(e.target.value)}>
                  {sources.map(s=><option key={s} value={s}>{s.toLowerCase()}</option>)}
                </select>
              </label>
              <input placeholder="Source ref (URL, book, etc.)" value={sourceRef} onChange={e=>setSourceRef(e.target.value)} style={{minWidth:240}}/>
              <label>Complexity
                <select value={complexity} onChange={e=>setComplexity(e.target.value)}>
                  {complexities.map(c=><option key={c} value={c}>{c.toLowerCase()}</option>)}
                </select>
              </label>
            </div>

            <div className="row" style={{marginTop:8}}>
              <input placeholder="Equipment (comma-separated)" value={equipment} onChange={e=>setEquipment(e.target.value)} style={{minWidth:220}}/>
              <input placeholder="Tags (comma-separated)" value={tags} onChange={e=>setTags(e.target.value)} style={{minWidth:220}}/>
              <input placeholder="Seasons (or leave empty for any)" value={seasons} onChange={e=>setSeasons(e.target.value)} style={{minWidth:200}}/>
            </div>

            <div className="row" style={{marginTop:8}}>
              <input placeholder="Techniques (comma-separated, e.g. braising, sautéing)" value={techniques} onChange={e=>setTechniques(e.target.value)} style={{width:"100%"}}/>
            </div>

            <div style={{marginTop:12}}>
              <label style={{display:"block", marginBottom:4}}>Ingredients (one per line) *</label>
              <textarea
                rows={5}
                style={{width:"100%"}}
                value={ingredientsText}
                onChange={e=>setIngredientsText(e.target.value)}
                placeholder={"chicken thighs (required)\nsoy sauce (required)\nblack pepper [ground] (optional)"}
              />
              <small className="muted">Format: <code>name [prep] (required/optional)</code></small>
            </div>

            <div style={{marginTop:12}}>
              <label style={{display:"block", marginBottom:4}}>Instructions</label>
              <textarea rows={5} style={{width:"100%"}} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Step 1..."/>
            </div>

            <div className="row" style={{marginTop:12}}>
              <button onClick={addRecipe} disabled={saving || !title.trim() || !ingredientsText.trim()}>
                {saving ? "Saving..." : editingId ? "Update Recipe" : "Save Recipe"}
              </button>
              {editingId && <button onClick={cancelEdit} disabled={saving} style={{color: "#888"}}>Cancel</button>}
              <button onClick={refresh} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
            </div>
            {editingId && (
              <p style={{marginTop: 8}}><small className="muted">Editing recipe. Click Update to save changes or Cancel to discard.</small></p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h3
          className="collapsible-header"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className={`collapse-icon ${showFilters ? "open" : ""}`}>▶</span>
          Filter Recipes
          {hasFilters && <span style={{marginLeft: 8, fontSize: 12, opacity: 0.7}}>({Object.values({searchQuery, filterCuisine, filterDifficulty, filterComplexity, filterSource, filterTag}).filter(Boolean).length} active)</span>}
        </h3>

        {showFilters && (
          <>
            <div className="row" style={{marginTop: 8}}>
              <input
                placeholder="Search by title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{minWidth: 200}}
              />
              <select value={filterCuisine} onChange={e => setFilterCuisine(e.target.value)}>
                <option value="">All cuisines</option>
                {allCuisines.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)}>
                <option value="">All tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="row" style={{marginTop: 8}}>
              <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value ? parseInt(e.target.value) : "")}>
                <option value="">Any difficulty</option>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>Difficulty {n}</option>)}
              </select>
              <select value={filterComplexity} onChange={e => setFilterComplexity(e.target.value)}>
                <option value="">Any complexity</option>
                {complexities.map(c => <option key={c} value={c}>{c.toLowerCase()}</option>)}
              </select>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                <option value="">Any source</option>
                {sources.map(s => <option key={s} value={s}>{s.toLowerCase()}</option>)}
              </select>
              {hasFilters && (
                <button onClick={clearFilters}>Clear filters</button>
              )}
            </div>
          </>
        )}
        <p style={{marginTop: 8, marginBottom: 0}}>
          <small className="muted">Showing {filtered.length} of {recipes.length} recipes</small>
        </p>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="spinner large"></span>
          <span>Loading recipes...</span>
        </div>
      ) : recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <h3>No recipes yet</h3>
          <p>Add your first recipe using the form above to get started.</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No matches</h3>
          <p>No recipes match your current filters. Try adjusting them.</p>
        </div>
      ) : (
        <>
          <div className="row" style={{margin:"16px 0 8px", justifyContent:"space-between", alignItems:"center"}}>
            <span style={{opacity:0.7}}>{sorted.length} recipes</span>
            <div className="row" style={{gap:8}}>
              <button onClick={expandAll} style={{padding:"2px 8px", fontSize:12}}>Expand All</button>
              <button onClick={collapseAll} style={{padding:"2px 8px", fontSize:12}}>Collapse All</button>
            </div>
          </div>

          {sorted.map(r => {
        const isExpanded = expandedRecipes.has(r.id);
        return (
          <div key={r.id} className="card">
            <div
              className="row"
              style={{justifyContent:"space-between", alignItems:"flex-start", cursor:"pointer"}}
              onClick={() => toggleExpanded(r.id)}
            >
              <div>
                <h3 style={{margin:"0 0 4px 0"}}>
                  <span style={{marginRight:8, opacity:0.5}}>{isExpanded ? "▼" : "▶"}</span>
                  {r.title}
                </h3>
                <small className="muted">
                  {r.totalMin}m total • {r.handsOnMin}m hands-on • serves {r.servings}{r.servingsMax ? `-${r.servingsMax}` : ""} • difficulty {r.difficulty}
                </small>
                <div style={{marginTop:4}}>
                  {r.cuisine && <span className="tag">{r.cuisine}</span>}
                  <span className="tag">{r.complexity.toLowerCase()}</span>
                  <span className="tag">{r.source.toLowerCase()}</span>
                  {r.techniques?.map(t => <span key={t.technique.id} className="tag tech">{t.technique.name}</span>)}
                </div>
              </div>
              {r.cookLogs.length > 0 && (
                <div style={{textAlign:"right"}}>
                  <small className="muted">
                    Made {r.cookLogs.length}× • Avg {(r.cookLogs.reduce((a,l)=>a+l.rating,0)/r.cookLogs.length).toFixed(1)}★
                  </small>
                </div>
              )}
            </div>

            {isExpanded && (
              <>
                {r.sourceRef && <div style={{marginTop:4}}><small className="muted">Source: {r.sourceRef}</small></div>}

                <div className="row" style={{marginTop:8}}>
                  <small className="muted">Equipment: {(r.equipment ?? []).join(", ") || "—"}</small>
                  <small className="muted">Tags: {(r.tags ?? []).join(", ") || "—"}</small>
                  {r.seasons?.length > 0 && <small className="muted">Seasons: {r.seasons.join(", ")}</small>}
                </div>

                <div style={{marginTop:12, marginBottom:6, display:"flex", alignItems:"center", gap:12}}>
                  <h4 style={{margin:0}}>Ingredients</h4>
                  <label style={{display:"flex", alignItems:"center", gap:4, fontSize:14}}>
                    for
                    <input
                      type="number"
                      min={1}
                      max={r.servingsMax || 20}
                      value={getScaledServings(r)}
                      onChange={e => setRecipeServings(r.id, parseInt(e.target.value) || r.servings)}
                      onClick={e => e.stopPropagation()}
                      style={{width:50, padding:"2px 4px"}}
                    />
                    servings
                    {getScaledServings(r) !== r.servings && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setRecipeServings(r.id, r.servings); }}
                        style={{padding:"2px 6px", fontSize:12}}
                      >
                        Reset
                      </button>
                    )}
                  </label>
                </div>
                <ul style={{margin:0, paddingLeft:20}}>
                  {r.ingredients.map(i => {
                    const ratio = getScaledServings(r) / r.servings;
                    const scaledQty = scaleQuantity(i.quantityText, ratio);
                    const subs = Array.isArray(i.substitutions) ? i.substitutions : [];
                    return (
                      <li key={i.id}>
                        {scaledQty && <span>{scaledQty} </span>}
                        {i.name}
                        {i.preparation && <span className="muted"> ({i.preparation})</span>}
                        {!i.required && <small className="muted"> (optional)</small>}
                        {subs.length > 0 && (
                          <small className="muted" style={{ marginLeft: 6 }}>
                            — or: {subs.join(", ")}
                          </small>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* Cost estimate */}
                {recipeCosts[r.id] !== undefined && (
                  <div style={{marginTop: 12, padding: 8, background: "rgba(127,127,127,0.08)", borderRadius: 6}}>
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                      <span style={{fontWeight: 500}}>Estimated Cost</span>
                      <span>
                        {recipeCosts[r.id] === null ? (
                          <span className="muted">Loading...</span>
                        ) : (() => {
                          const scalingRatio = getScaledServings(r) / r.servings;
                          const scaledTotal = Math.round(recipeCosts[r.id]!.totalCents * scalingRatio);
                          const scaledPerServing = recipeCosts[r.id]!.costPerServing;
                          return (
                            <>
                              <strong>{formatCost(scaledTotal)}</strong>
                              {scaledPerServing != null && (
                                <span className="muted"> ({formatCost(scaledPerServing)}/serving)</span>
                              )}
                            </>
                          );
                        })()}
                      </span>
                    </div>
                    {recipeCosts[r.id] && (
                      <small className="muted" style={{display: "block", marginTop: 4}}>
                        Based on {recipeCosts[r.id]!.matchedCount}/{recipeCosts[r.id]!.totalIngredients} ingredients with prices
                        {!recipeCosts[r.id]!.complete && " (incomplete - some required ingredients missing prices)"}
                      </small>
                    )}
                  </div>
                )}

                {r.instructions && (
                  <>
                    <h4 style={{marginTop:12, marginBottom:6}}>Instructions</h4>
                    <pre style={{margin:0, whiteSpace:"pre-wrap"}}>{r.instructions}</pre>
                  </>
                )}

                <div className="row" style={{marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(127,127,127,0.2)"}}>
                  <button onClick={(e) => { e.stopPropagation(); editRecipe(r); }} style={{padding: "4px 12px"}}>Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); promptDelete(r.id, r.title); }} style={{padding: "4px 12px", color: "#c44"}}>Delete</button>
                </div>
              </>
            )}
          </div>
        );
      })}
        </>
      )}

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
      `}</style>

      <ConfirmModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmDelete}
        title="Delete Recipe"
        message={`Are you sure you want to delete "${deleteModal?.title}" and all its cook logs? This cannot be undone.`}
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
