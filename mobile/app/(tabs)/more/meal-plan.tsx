import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";

type MealPlan = {
  id: string;
  date: string;
  slot: "breakfast" | "lunch" | "dinner";
  notes: string | null;
  servings: number | null;
  recipe: { title: string; caloriesPerServing: number | null } | null;
};

const SLOT_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const SLOT_EMOJI = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function MealPlanScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = isoDate(weekStart);
      const end = isoDate(weekEnd);
      const res = await apiFetch(`/api/mealplan?start=${start}&end=${end}`);
      if (!res.ok) { Alert.alert("Error", "Could not load meal plan"); return; }
      const data = await res.json();
      setPlans(data.plans ?? []);
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => { load(); }, [load]);

  // Group by date
  const days: { date: string; slots: MealPlan[] }[] = [];
  const seen = new Set<string>();
  for (const p of plans) {
    const d = p.date.split("T")[0];
    if (!seen.has(d)) { seen.add(d); days.push({ date: d, slots: [] }); }
    days.find(x => x.date === d)!.slots.push(p);
  }

  // Fill in empty days for the week
  const allDays: { date: string; slots: MealPlan[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = isoDate(d);
    allDays.push(days.find(x => x.date === key) ?? { date: key, slots: [] });
  }

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Meal Plan</Text>
      </View>

      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={styles.navBtn}>
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={styles.navBtn}>
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4a90d9" size="large" />
        </View>
      ) : (
        <FlatList
          data={allDays}
          keyExtractor={d => d.date}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item: day }) => (
            <View style={styles.day}>
              <Text style={styles.dayLabel}>{fmtDate(day.date)}</Text>
              {(["breakfast", "lunch", "dinner"] as const).map(slot => {
                const entry = day.slots.find(s => s.slot === slot);
                return (
                  <View key={slot} style={styles.slot}>
                    <Text style={styles.slotEmoji}>{SLOT_EMOJI[slot]}</Text>
                    <View style={styles.slotBody}>
                      <Text style={styles.slotLabel}>{SLOT_LABEL[slot]}</Text>
                      {entry?.recipe ? (
                        <Text style={styles.slotRecipe}>{entry.recipe.title}</Text>
                      ) : entry?.notes ? (
                        <Text style={styles.slotNotes}>{entry.notes}</Text>
                      ) : (
                        <Text style={styles.slotEmpty}>—</Text>
                      )}
                    </View>
                    {entry?.recipe?.caloriesPerServing && (
                      <Text style={styles.slotCal}>{entry.recipe.caloriesPerServing} cal</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        />
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
  weekNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#1e1e24",
  },
  navBtn: { padding: 8 },
  navBtnText: { color: "#4a90d9", fontSize: 22 },
  weekLabel: { fontSize: 14, color: "#aaa", fontWeight: "500" },
  day: {
    marginHorizontal: 12, marginTop: 10,
    backgroundColor: "#1e1e24", borderRadius: 12, overflow: "hidden",
  },
  dayLabel: {
    fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 0.8,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
  },
  slot: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 9,
    borderTopWidth: 1, borderTopColor: "#2e2e38",
  },
  slotEmoji: { fontSize: 16, marginRight: 10, width: 22 },
  slotBody: { flex: 1 },
  slotLabel: { fontSize: 11, color: "#555", marginBottom: 1 },
  slotRecipe: { fontSize: 14, color: "#fff" },
  slotNotes: { fontSize: 13, color: "#888", fontStyle: "italic" },
  slotEmpty: { fontSize: 13, color: "#333" },
  slotCal: { fontSize: 11, color: "#555" },
});
