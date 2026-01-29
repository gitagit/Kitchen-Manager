"use client";

import { useState, useEffect } from "react";

type CookLog = {
  id: string;
  recipeId: string;
  cookedOn: string;
  rating: number;
  notes: string | null;
  wouldRepeat: boolean;
  servedTo: number | null;
  recipe: {
    id: string;
    title: string;
    cuisine: string | null;
  };
};

type Stats = {
  totalCooks: number;
  avgRating: number;
  topRecipes: { title: string; count: number }[];
};

export default function HistoryClient() {
  const [logs, setLogs] = useState<CookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    const res = await fetch("/api/cooklogs");
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }

  const filtered = logs.filter(log => {
    if (search && !log.recipe.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (minRating > 0 && log.rating < minRating) {
      return false;
    }
    return true;
  });

  const stats: Stats = {
    totalCooks: logs.length,
    avgRating: logs.length > 0
      ? Math.round((logs.reduce((sum, l) => sum + l.rating, 0) / logs.length) * 10) / 10
      : 0,
    topRecipes: Object.entries(
      logs.reduce((acc, log) => {
        acc[log.recipe.title] = (acc[log.recipe.title] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }))
  };

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function renderStars(rating: number) {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  }

  if (loading) {
    return (
      <div className="loading-state">
        <span className="spinner large"></span>
        <span>Loading history...</span>
      </div>
    );
  }

  return (
    <>
      {logs.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 8px 0" }}>Stats</h3>
          <div className="row">
            <div>
              <strong>{stats.totalCooks}</strong>
              <span className="muted"> cooks</span>
            </div>
            <div>
              <strong>{stats.avgRating}</strong>
              <span className="muted"> avg rating</span>
            </div>
          </div>
          {stats.topRecipes.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <small className="muted">Most cooked:</small>
              <div style={{ marginTop: 4 }}>
                {stats.topRecipes.map((r, i) => (
                  <span key={r.title} className="tag" style={{ marginRight: 6 }}>
                    {r.title} ({r.count})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="row">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search recipes..."
            style={{ minWidth: 200 }}
          />
          <label>
            Min rating
            <select value={minRating} onChange={e => setMinRating(parseInt(e.target.value, 10))}>
              <option value={0}>Any</option>
              <option value={1}>1+</option>
              <option value={2}>2+</option>
              <option value={3}>3+</option>
              <option value={4}>4+</option>
              <option value={5}>5</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h3>No cook history yet</h3>
            <p>Use &quot;I Made This&quot; on suggestions to log your first cook!</p>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No matches</h3>
            <p>No logs match your current filters.</p>
          </div>
        )
      ) : (
        <div style={{ marginTop: 16 }}>
          {filtered.map(log => (
            <div key={log.id} className="card" style={{ marginBottom: 8 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px 0" }}>{log.recipe.title}</h4>
                  <small className="muted">{formatDate(log.cookedOn)}</small>
                  {log.recipe.cuisine && (
                    <span className="tag" style={{ marginLeft: 8 }}>{log.recipe.cuisine}</span>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "rgba(255,180,0,0.9)", letterSpacing: 2 }}>
                    {renderStars(log.rating)}
                  </div>
                  <small className={log.wouldRepeat ? "" : "muted"}>
                    {log.wouldRepeat ? "Would repeat" : "Would not repeat"}
                  </small>
                </div>
              </div>
              {log.notes && (
                <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.85 }}>{log.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          background: rgba(127,127,127,0.15);
        }
      `}</style>
    </>
  );
}
