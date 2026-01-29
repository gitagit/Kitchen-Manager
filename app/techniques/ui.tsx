"use client";

import { useEffect, useState } from "react";

type Technique = {
  id: string;
  name: string;
  description: string | null;
  difficulty: number;
  comfort: number; // 0=untried, 1=learning, 2=comfortable, 3=confident
  recipes: { recipe: { id: string; title: string } }[];
};

const comfortLevels = [
  { value: 0, label: "Untried", emoji: "❓" },
  { value: 1, label: "Learning", emoji: "📖" },
  { value: 2, label: "Comfortable", emoji: "👍" },
  { value: 3, label: "Confident", emoji: "⭐" }
];

export default function TechniquesClient() {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState(2);

  async function refresh() {
    setLoading(true);
    const res = await fetch("/api/techniques");
    const data = await res.json();
    setTechniques(data.techniques ?? []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function addTechnique() {
    if (!name.trim()) return;
    await fetch("/api/techniques", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description: description || undefined, difficulty })
    });
    setName("");
    setDescription("");
    await refresh();
  }

  async function updateComfort(id: string, comfort: number) {
    await fetch("/api/techniques", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, comfort })
    });
    await refresh();
  }

  // Group by comfort level
  const byComfort = {
    untried: techniques.filter(t => t.comfort === 0),
    learning: techniques.filter(t => t.comfort === 1),
    comfortable: techniques.filter(t => t.comfort === 2),
    confident: techniques.filter(t => t.comfort === 3)
  };

  return (
    <>
      <div className="card">
        <h3>Add Technique</h3>
        <div className="row">
          <input 
            placeholder="Technique name (e.g. braising)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            style={{ minWidth: 200 }}
          />
          <label>
            Difficulty
            <select value={difficulty} onChange={e => setDifficulty(parseInt(e.target.value))}>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button onClick={addTechnique}>Add</button>
          <button onClick={refresh} disabled={loading}>{loading ? "..." : "Refresh"}</button>
        </div>
        <div style={{ marginTop: 8 }}>
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div className="card" style={{ background: "rgba(100,200,100,0.1)" }}>
        <h3>⭐ Confident ({byComfort.confident.length})</h3>
        {byComfort.confident.length === 0 ? (
          <small className="muted">Keep practicing—you&apos;ll get here!</small>
        ) : (
          <div className="tech-grid">
            {byComfort.confident.map(t => (
              <TechniqueCard key={t.id} technique={t} onUpdateComfort={updateComfort} />
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ background: "rgba(100,150,255,0.1)" }}>
        <h3>👍 Comfortable ({byComfort.comfortable.length})</h3>
        {byComfort.comfortable.length === 0 ? (
          <small className="muted">Techniques you&apos;ve gotten the hang of will appear here.</small>
        ) : (
          <div className="tech-grid">
            {byComfort.comfortable.map(t => (
              <TechniqueCard key={t.id} technique={t} onUpdateComfort={updateComfort} />
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ background: "rgba(255,200,100,0.1)" }}>
        <h3>📖 Learning ({byComfort.learning.length})</h3>
        {byComfort.learning.length === 0 ? (
          <small className="muted">Techniques you&apos;re currently working on.</small>
        ) : (
          <div className="tech-grid">
            {byComfort.learning.map(t => (
              <TechniqueCard key={t.id} technique={t} onUpdateComfort={updateComfort} />
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>❓ Untried ({byComfort.untried.length})</h3>
        {byComfort.untried.length === 0 ? (
          <small className="muted">All techniques tried! Add more to keep growing.</small>
        ) : (
          <div className="tech-grid">
            {byComfort.untried.map(t => (
              <TechniqueCard key={t.id} technique={t} onUpdateComfort={updateComfort} />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .tech-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
      `}</style>
    </>
  );
}

function TechniqueCard({ 
  technique, 
  onUpdateComfort 
}: { 
  technique: Technique; 
  onUpdateComfort: (id: string, comfort: number) => void;
}) {
  const current = comfortLevels.find(l => l.value === technique.comfort)!;
  
  return (
    <div style={{ 
      padding: 12, 
      border: "1px solid rgba(127,127,127,0.25)", 
      borderRadius: 8,
      background: "rgba(255,255,255,0.03)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <strong>{technique.name}</strong>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            Difficulty: {"★".repeat(technique.difficulty)}{"☆".repeat(5 - technique.difficulty)}
          </div>
        </div>
        <select 
          value={technique.comfort} 
          onChange={e => onUpdateComfort(technique.id, parseInt(e.target.value))}
          style={{ fontSize: 12 }}
        >
          {comfortLevels.map(l => (
            <option key={l.value} value={l.value}>{l.emoji} {l.label}</option>
          ))}
        </select>
      </div>
      
      {technique.description && (
        <p style={{ fontSize: 13, margin: "8px 0 0", opacity: 0.8 }}>{technique.description}</p>
      )}
      
      {technique.recipes.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          <span className="muted">Used in: </span>
          {technique.recipes.slice(0, 3).map((r, i) => (
            <span key={r.recipe.id}>
              {i > 0 && ", "}
              {r.recipe.title}
            </span>
          ))}
          {technique.recipes.length > 3 && <span className="muted"> +{technique.recipes.length - 3} more</span>}
        </div>
      )}
    </div>
  );
}
