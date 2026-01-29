"use client";

import { useEffect, useState } from "react";

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
};

type LogForm = {
  recipeId: string;
  title: string;
} | null;

export default function SuggestClient() {
  const [servings, setServings] = useState(2);
  const [maxTotalMin, setMaxTotalMin] = useState(45);
  const [equipment, setEquipment] = useState("OVEN,STOVETOP");
  const [occasion, setOccasion] = useState<"WEEKNIGHT"|"POTLUCK"|"MEAL_PREP"|"ANY">("WEEKNIGHT");
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

  // Cook log form state
  const [logForm, setLogForm] = useState<LogForm>(null);
  const [logRating, setLogRating] = useState(4);
  const [logNotes, setLogNotes] = useState("");
  const [logWouldRepeat, setLogWouldRepeat] = useState(true);
  const [logSaving, setLogSaving] = useState(false);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);

  // Fetch available techniques on mount
  useEffect(() => {
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
    setLoading(false);
  }

  function toggleTechnique(name: string) {
    setSelectedTechniques(prev =>
      prev.includes(name)
        ? prev.filter(t => t !== name)
        : [...prev, name]
    );
  }

  function openLogForm(recipeId: string, title: string) {
    setLogForm({ recipeId, title });
    setLogRating(4);
    setLogNotes("");
    setLogWouldRepeat(true);
    setLogSuccess(null);
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
      if (res.ok) {
        setLogSuccess(logForm.title);
        setLogForm(null);
        setTimeout(() => setLogSuccess(null), 3000);
      }
    } finally {
      setLogSaving(false);
    }
  }

  return (
    <>
      <div className="card">
        <h3>What are you looking for?</h3>
        <div className="row">
          <label>Servings <input type="number" value={servings} onChange={e=>setServings(parseInt(e.target.value||"2",10))} style={{maxWidth:70}}/></label>
          <label>Max minutes <input type="number" value={maxTotalMin} onChange={e=>setMaxTotalMin(parseInt(e.target.value||"45",10))} style={{maxWidth:80}}/></label>
          <label>Occasion
            <select value={occasion} onChange={e=>setOccasion(e.target.value as any)}>
              <option value="WEEKNIGHT">Weeknight</option>
              <option value="POTLUCK">Potluck</option>
              <option value="MEAL_PREP">Meal Prep</option>
              <option value="ANY">Any</option>
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

        <div className="row" style={{marginTop:12}}>
          <button onClick={run} disabled={loading} style={{padding:"10px 24px", fontWeight:500}}>
            {loading ? "Finding recipes..." : "🍳 Suggest Dinner"}
          </button>
        </div>
      </div>

      {logSuccess && (
        <div className="card" style={{background:"rgba(100,200,100,0.15)", marginTop:16}}>
          Logged &quot;{logSuccess}&quot; to your cook history!
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
              {(r.cuisine || r.complexity || r.techniques?.length) && (
                <div style={{marginTop:4}}>
                  {r.cuisine && <span className="tag">{r.cuisine}</span>}
                  {r.complexity && <span className="tag">{r.complexity.toLowerCase()}</span>}
                  {r.techniques?.map(t => <span key={t} className="tag tech">{t}</span>)}
                </div>
              )}
            </div>
            <button
              onClick={() => openLogForm(r.recipeId, r.title)}
              style={{padding:"6px 12px", fontSize:13}}
            >
              I Made This
            </button>
          </div>

          {logForm?.recipeId === r.recipeId && (
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
              <div className="row">
                <button onClick={submitLog} disabled={logSaving} style={{padding:"6px 16px"}}>
                  {logSaving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setLogForm(null)} style={{padding:"6px 12px"}}>
                  Cancel
                </button>
              </div>
            </div>
          )}

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
      `}</style>
    </>
  );
}
