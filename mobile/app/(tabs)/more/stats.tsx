import { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";

type Overview = {
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
};

type TopItem = { title: string; count?: number; avgRating?: number };

type Stats = {
  overview: Overview;
  mostCooked: TopItem[];
  highestRated: TopItem[];
  topCuisines: { cuisine: string; count: number }[];
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

export default function StatsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/stats");
      if (!res.ok) { Alert.alert("Error", "Could not load stats"); return; }
      const data = await res.json();
      setStats(data);
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Stats</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4a90d9" size="large" />
        </View>
      ) : !stats ? null : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.sectionLabel}>Overview</Text>
          <View style={styles.grid}>
            <StatCard label="Total meals" value={stats.overview.totalMeals} />
            <StatCard label="Recipes" value={stats.overview.totalRecipes} />
            <StatCard label="Avg rating" value={stats.overview.avgRating.toFixed(1)} sub="/ 5" />
            <StatCard label="Would repeat" value={`${stats.overview.wouldRepeatPct}%`} />
            <StatCard label="Last 30 days" value={stats.overview.last30DaysMeals} sub="meals" />
            <StatCard label="Streak" value={stats.overview.currentStreak} sub="days" />
            <StatCard label="Cuisines tried" value={stats.overview.uniqueCuisinesCooked} />
            <StatCard label="People served" value={stats.overview.totalPeopleServed} />
          </View>

          {stats.mostCooked.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Most Cooked</Text>
              <View style={styles.listCard}>
                {stats.mostCooked.slice(0, 5).map((r, i) => (
                  <View key={i} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                    <Text style={styles.listRank}>{i + 1}</Text>
                    <Text style={styles.listTitle} numberOfLines={1}>{r.title}</Text>
                    {r.count != null && <Text style={styles.listMeta}>{r.count}x</Text>}
                  </View>
                ))}
              </View>
            </>
          )}

          {stats.highestRated.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Highest Rated</Text>
              <View style={styles.listCard}>
                {stats.highestRated.slice(0, 5).map((r, i) => (
                  <View key={i} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                    <Text style={styles.listRank}>{i + 1}</Text>
                    <Text style={styles.listTitle} numberOfLines={1}>{r.title}</Text>
                    {r.avgRating != null && (
                      <Text style={styles.listMeta}>★ {r.avgRating.toFixed(1)}</Text>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

          {stats.topCuisines.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Top Cuisines</Text>
              <View style={styles.listCard}>
                {stats.topCuisines.slice(0, 5).map((c, i) => (
                  <View key={i} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                    <Text style={styles.listRank}>{i + 1}</Text>
                    <Text style={styles.listTitle}>{c.cuisine}</Text>
                    <Text style={styles.listMeta}>{c.count} meals</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f12" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, gap: 12,
  },
  back: { padding: 4 },
  backText: { color: "#4a90d9", fontSize: 17 },
  title: { fontSize: 20, fontWeight: "700", color: "#fff" },
  sectionLabel: {
    fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 1,
    marginHorizontal: 16, marginTop: 20, marginBottom: 8,
  },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  statCard: {
    width: "50%",
    padding: 8,
  },
  statCardInner: {
    backgroundColor: "#1e1e24", borderRadius: 12, padding: 16, alignItems: "center",
  },
  statValue: {
    fontSize: 28, fontWeight: "700", color: "#fff",
    backgroundColor: "#1e1e24", borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 10,
    textAlign: "center", width: "100%",
  },
  statLabel: { fontSize: 12, color: "#555", textAlign: "center", marginTop: 2 },
  statSub: { fontSize: 11, color: "#444", textAlign: "center" },
  listCard: {
    marginHorizontal: 12, backgroundColor: "#1e1e24", borderRadius: 12, overflow: "hidden",
  },
  listRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 11,
  },
  listRowBorder: { borderTopWidth: 1, borderTopColor: "#2e2e38" },
  listRank: { fontSize: 13, color: "#555", width: 22 },
  listTitle: { flex: 1, fontSize: 14, color: "#fff" },
  listMeta: { fontSize: 13, color: "#666" },
});
