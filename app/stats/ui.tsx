"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  overview: {
    totalMeals: number;
    totalRecipes: number;
    totalPeopleServed: number;
    avgRating: number;
    wouldRepeatPct: number;
    avgMealsPerWeek: number;
    last30DaysMeals: number;
    currentStreak: number;
  };
  ratingDistribution: Record<number, number>;
  topCuisines: { cuisine: string; count: number }[];
  mostCooked: { id: string; title: string; count: number; avgRating: number }[];
  highestRated: { id: string; title: string; count: number; avgRating: number }[];
  monthlyActivity: Record<string, number>;
  techniqueStats: { id: string; name: string; comfort: number; difficulty: number; recipesCount: number; timesUsed: number }[];
  comfortDistribution: { untried: number; learning: number; comfortable: number; confident: number };
};

const COMFORT_LABELS = ["Untried", "Learning", "Comfortable", "Confident"];
const COMFORT_COLORS = ["#888", "#f5a623", "#7ed321", "#4a90d9"];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function BarChart({ data, maxValue }: { data: { label: string; value: number; color?: string }[]; maxValue?: number }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-row">
          <div className="bar-label">{d.label}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.color || "#4a90d9"
              }}
            />
          </div>
          <div className="bar-value">{d.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function StatsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <span className="spinner large"></span>
        <span>Loading stats...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <h3>Failed to load stats</h3>
        <p>Something went wrong. Try refreshing the page.</p>
      </div>
    );
  }

  const { overview, ratingDistribution, topCuisines, mostCooked, highestRated, monthlyActivity, techniqueStats, comfortDistribution } = stats;

  // Format monthly activity for chart
  const sortedMonths = Object.entries(monthlyActivity).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);

  return (
    <>
      {/* Overview Cards */}
      <div className="stat-grid">
        <StatCard label="Total Meals Cooked" value={overview.totalMeals} />
        <StatCard label="Recipes in Library" value={overview.totalRecipes} />
        <StatCard label="Avg Rating" value={`${overview.avgRating}★`} />
        <StatCard label="Would Repeat" value={`${overview.wouldRepeatPct}%`} />
        <StatCard label="Meals/Week" value={overview.avgMealsPerWeek} sub="last 12 weeks" />
        <StatCard label="Last 30 Days" value={overview.last30DaysMeals} sub="meals cooked" />
        <StatCard label="Current Streak" value={overview.currentStreak} sub="days" />
        <StatCard label="People Served" value={overview.totalPeopleServed} sub="total" />
      </div>

      <div className="stats-row">
        {/* Rating Distribution */}
        <div className="card">
          <h3>Rating Distribution</h3>
          <BarChart
            data={[5, 4, 3, 2, 1].map(r => ({
              label: `${r}★`,
              value: ratingDistribution[r] || 0,
              color: r >= 4 ? "#7ed321" : r === 3 ? "#f5a623" : "#d0021b"
            }))}
          />
        </div>

        {/* Top Cuisines */}
        <div className="card">
          <h3>Top Cuisines</h3>
          {topCuisines.length > 0 ? (
            <BarChart
              data={topCuisines.map(c => ({
                label: c.cuisine,
                value: c.count
              }))}
            />
          ) : (
            <p className="muted">No data yet. Start logging your meals!</p>
          )}
        </div>
      </div>

      <div className="stats-row">
        {/* Most Cooked Recipes */}
        <div className="card">
          <h3>Most Cooked</h3>
          {mostCooked.length > 0 ? (
            <table style={{ width: "100%" }}>
              <tbody>
                {mostCooked.map(r => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/recipes?search=${encodeURIComponent(r.title)}`} className="recipe-link">
                        {r.title}
                      </Link>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {r.count}× <span className="muted">({r.avgRating.toFixed(1)}★)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">No data yet.</p>
          )}
        </div>

        {/* Highest Rated (with 2+ cooks) */}
        <div className="card">
          <h3>Highest Rated</h3>
          <p><small className="muted">Recipes cooked 2+ times</small></p>
          {highestRated.length > 0 ? (
            <table style={{ width: "100%" }}>
              <tbody>
                {highestRated.map(r => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/recipes?search=${encodeURIComponent(r.title)}`} className="recipe-link">
                        {r.title}
                      </Link>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {r.avgRating.toFixed(1)}★ <span className="muted">({r.count}×)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Cook recipes multiple times to see ratings.</p>
          )}
        </div>
      </div>

      {/* Monthly Activity */}
      <div className="card">
        <h3>Monthly Activity</h3>
        {sortedMonths.length > 0 ? (
          <BarChart
            data={sortedMonths.map(([month, count]) => ({
              label: month,
              value: count
            }))}
          />
        ) : (
          <p className="muted">No activity recorded yet.</p>
        )}
      </div>

      {/* Technique Progress */}
      <div className="card">
        <h3>Technique Progress</h3>
        <div className="comfort-summary">
          <span style={{ color: COMFORT_COLORS[3] }}>{comfortDistribution.confident} Confident</span>
          <span style={{ color: COMFORT_COLORS[2] }}>{comfortDistribution.comfortable} Comfortable</span>
          <span style={{ color: COMFORT_COLORS[1] }}>{comfortDistribution.learning} Learning</span>
          <span style={{ color: COMFORT_COLORS[0] }}>{comfortDistribution.untried} Untried</span>
        </div>
        {techniqueStats.length > 0 ? (
          <table style={{ width: "100%", marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Technique</th>
                <th style={{ textAlign: "center" }}>Comfort</th>
                <th style={{ textAlign: "right" }}>Times Used</th>
              </tr>
            </thead>
            <tbody>
              {techniqueStats.slice(0, 10).map(t => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ color: COMFORT_COLORS[t.comfort], fontWeight: 500 }}>
                      {COMFORT_LABELS[t.comfort]}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>{t.timesUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Add techniques to your recipes to track progress.</p>
        )}
      </div>

      <style jsx>{`
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: rgba(127,127,127,0.08);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 600;
          line-height: 1.2;
        }
        .stat-label {
          font-size: 13px;
          color: #888;
          margin-top: 4px;
        }
        .stat-sub {
          font-size: 11px;
          color: #aaa;
          margin-top: 2px;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }
        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .bar-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bar-label {
          width: 80px;
          font-size: 13px;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bar-track {
          flex: 1;
          height: 20px;
          background: rgba(127,127,127,0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .bar-value {
          width: 30px;
          font-size: 13px;
          text-align: right;
        }
        .comfort-summary {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 14px;
        }
        :global(.recipe-link) {
          color: var(--accent, #4a9eff);
          text-decoration: none;
        }
        :global(.recipe-link:hover) {
          text-decoration: underline;
        }
      `}</style>
    </>
  );
}
