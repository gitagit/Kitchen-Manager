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
    longestStreak: number;
    uniqueCuisinesCooked: number;
    avgCostPerMealCents: number | null;
  };
  showGamification: boolean;
  nutrition: {
    avgDailyCalories: number | null;
    avgDailyProteinG: number | null;
    avgDailyCarbsG:   number | null;
    avgDailyFatG:     number | null;
    goals: {
      calorieGoal:  number | null;
      proteinGoalG: number | null;
      carbsGoalG:   number | null;
      fatGoalG:     number | null;
    };
  };
  waste: {
    totalWasteItems: number;
    totalWasteCents: number;
    last30DaysWasteCents: number;
    wasteMonthly: { month: string; cents: number }[];
    mostWasted: { name: string; count: number; totalCents: number }[];
    wasteByReason: Record<string, number>;
  };
  ratingDistribution: Record<number, number>;
  topCuisines: { cuisine: string; count: number }[];
  mostCooked: { id: string; title: string; count: number; avgRating: number }[];
  highestRated: { id: string; title: string; count: number; avgRating: number }[];
  monthlyActivity: Record<string, number>;
  techniqueStats: { id: string; name: string; comfort: number; difficulty: number; recipesCount: number; timesUsed: number }[];
  comfortDistribution: { untried: number; learning: number; comfortable: number; confident: number };
};

function achievedMilestone(val: number, thresholds: [number, string][]): string | null {
  let best: string | null = null;
  for (const [threshold, label] of thresholds) {
    if (val >= threshold) best = label;
  }
  return best;
}

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
      <div>
        <div className="row" style={{ gap: 12, marginBottom: 16 }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="skeleton-card" style={{ flex: "1 1 200px" }}>
              <div className="skeleton skeleton-line short" />
              <div className="skeleton skeleton-heading" style={{ width: "60%" }} />
            </div>
          ))}
        </div>
        {[1, 2].map(n => (
          <div key={n} className="skeleton-card">
            <div className="skeleton skeleton-heading" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line medium" />
            <div className="skeleton skeleton-line short" />
          </div>
        ))}
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

  const { overview, ratingDistribution, topCuisines, mostCooked, highestRated, monthlyActivity, techniqueStats, comfortDistribution, showGamification, nutrition, waste } = stats;

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
        <StatCard
          label="Avg Cost/Meal"
          value={overview.avgCostPerMealCents != null ? `$${(overview.avgCostPerMealCents / 100).toFixed(2)}` : "—"}
          sub="per serving"
        />
      </div>

      {/* Waste Tracking */}
      {waste.totalWasteItems > 0 && (
        <>
          <div className="card">
            <h3 style={{ margin: "0 0 12px 0" }}>Food Waste</h3>
            <div className="stat-grid">
              <StatCard
                label="Total Wasted"
                value={`$${(waste.totalWasteCents / 100).toFixed(2)}`}
                sub={`${waste.totalWasteItems} item${waste.totalWasteItems !== 1 ? "s" : ""}`}
              />
              <StatCard
                label="Last 30 Days"
                value={`$${(waste.last30DaysWasteCents / 100).toFixed(2)}`}
                sub="wasted"
              />
            </div>
          </div>

          <div className="stats-row">
            {waste.wasteMonthly.length > 0 && (
              <div className="card">
                <h3>Monthly Waste ($)</h3>
                <BarChart
                  data={waste.wasteMonthly.map(w => ({
                    label: w.month,
                    value: Math.round(w.cents / 100),
                    color: "#c44"
                  }))}
                />
              </div>
            )}

            {waste.mostWasted.length > 0 && (
              <div className="card">
                <h3>Most Wasted Items</h3>
                <table style={{ width: "100%" }}>
                  <tbody>
                    {waste.mostWasted.map((w, i) => (
                      <tr key={i}>
                        <td>{w.name}</td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {w.count}x <span className="muted">{w.totalCents > 0 ? `($${(w.totalCents / 100).toFixed(2)})` : ""}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {Object.keys(waste.wasteByReason).length > 0 && (
            <div className="card">
              <h3>Waste by Reason</h3>
              <BarChart
                data={Object.entries(waste.wasteByReason)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => ({
                    label: reason.charAt(0) + reason.slice(1).toLowerCase(),
                    value: count,
                    color: reason === "EXPIRED" ? "#c44" : reason === "SPOILED" ? "#c90" : "#4a90d9"
                  }))}
              />
            </div>
          )}
        </>
      )}

      {/* Nutrition Section */}
      {nutrition.avgDailyCalories != null && (() => {
        const macros = [
          { label: "Avg Daily Calories", value: nutrition.avgDailyCalories, unit: "kcal", goal: nutrition.goals.calorieGoal },
          { label: "Avg Daily Protein",  value: nutrition.avgDailyProteinG, unit: "g",    goal: nutrition.goals.proteinGoalG },
          { label: "Avg Daily Carbs",    value: nutrition.avgDailyCarbsG,   unit: "g",    goal: nutrition.goals.carbsGoalG },
          { label: "Avg Daily Fat",      value: nutrition.avgDailyFatG,     unit: "g",    goal: nutrition.goals.fatGoalG },
        ];
        return (
          <div className="card">
            <h3 style={{ margin: "0 0 12px 0" }}>Nutrition</h3>
            <p style={{ margin: "0 0 14px 0", fontSize: 13, opacity: 0.55 }}>Averages based on your cook log history. Set goals in Preferences.</p>
            <div className="stat-grid">
              {macros.map(({ label, value, unit, goal }) => {
                const pct = (goal && value) ? Math.min(100, Math.round((value / goal) * 100)) : null;
                const color = pct != null && pct >= 90 ? "rgba(100,200,100,0.7)" : "rgba(100,150,255,0.7)";
                return (
                  <div key={label} className="stat-card">
                    <div className="stat-value">{value ?? "—"}{value != null ? <span style={{ fontSize: "0.55em", marginLeft: 2, opacity: 0.7 }}>{unit}</span> : ""}</div>
                    <div className="stat-label">{label}</div>
                    {goal && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 3 }}>goal: {goal}{unit} · {pct}%</div>
                        <div style={{ height: 4, borderRadius: 2, background: "rgba(127,127,127,0.15)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {showGamification && (
        <div className="card">
          <h3>Cook Achievements</h3>
          <div className="stat-grid" style={{ marginTop: 12 }}>
            <div className="stat-card">
              <div className="stat-value">
                🔥 {overview.currentStreak}
                {achievedMilestone(overview.currentStreak, [[7,"🥉"],[14,"🥈"],[30,"🥇"]]) && (
                  <span style={{ marginLeft: 6, fontSize: 18 }}>{achievedMilestone(overview.currentStreak, [[7,"🥉"],[14,"🥈"],[30,"🥇"]])}</span>
                )}
              </div>
              <div className="stat-label">Day Streak</div>
              <div className="stat-sub">Best: {overview.longestStreak} day{overview.longestStreak !== 1 ? "s" : ""}</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">
                🍽️ {overview.totalMeals}
                {achievedMilestone(overview.totalMeals, [[10,"⭐"],[25,"🥉"],[50,"🥈"],[100,"🥇"]]) && (
                  <span style={{ marginLeft: 6, fontSize: 18 }}>{achievedMilestone(overview.totalMeals, [[10,"⭐"],[25,"🥉"],[50,"🥈"],[100,"🥇"]])}</span>
                )}
              </div>
              <div className="stat-label">Meals Cooked</div>
              <div className="stat-sub">Next: {[10,25,50,100,200].find(m => m > overview.totalMeals) ?? "Legend!"}</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">
                🌍 {overview.uniqueCuisinesCooked}
                {achievedMilestone(overview.uniqueCuisinesCooked, [[5,"🥉"],[10,"🥈"],[15,"🥇"]]) && (
                  <span style={{ marginLeft: 6, fontSize: 18 }}>{achievedMilestone(overview.uniqueCuisinesCooked, [[5,"🥉"],[10,"🥈"],[15,"🥇"]])}</span>
                )}
              </div>
              <div className="stat-label">Cuisines Explored</div>
              <div className="stat-sub">Next: {[5,10,15,20].find(m => m > overview.uniqueCuisinesCooked) ?? "World chef!"}</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">⚒️ {comfortDistribution.confident}</div>
              <div className="stat-label">Techniques Mastered</div>
              <div className="stat-sub">{comfortDistribution.comfortable} comfortable · {comfortDistribution.learning} learning</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">⭐ {overview.avgRating.toFixed(1)}</div>
              <div className="stat-label">Avg Rating</div>
              <div className="stat-sub">{overview.wouldRepeatPct}% would repeat</div>
            </div>
          </div>
        </div>
      )}

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
