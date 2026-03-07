import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";

type CookLog = {
  id: string;
  cookedOn: string;
  rating: number;
  notes: string | null;
  wouldRepeat: boolean;
  servedTo: number | null;
  recipe: { id: string; title: string; cuisine: string | null };
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default function HistoryScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<CookLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/cooklogs");
      if (!res.ok) { Alert.alert("Error", "Could not load history"); return; }
      const data = await res.json();
      setLogs(data.logs ?? []);
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
        <Text style={styles.title}>Cook History</Text>
        {logs.length > 0 && <Text style={styles.count}>{logs.length}</Text>}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4a90d9" size="large" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={l => l.id}
          contentContainerStyle={logs.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
          renderItem={({ item: l }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.recipeTitle}>{l.recipe.title}</Text>
                  <Text style={styles.meta}>
                    {fmtDate(l.cookedOn)}
                    {l.recipe.cuisine ? ` · ${l.recipe.cuisine}` : ""}
                    {l.servedTo ? ` · ${l.servedTo} people` : ""}
                  </Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.stars}>{stars(l.rating)}</Text>
                  {!l.wouldRepeat && <Text style={styles.noRepeat}>skip next time</Text>}
                </View>
              </View>
              {l.notes && <Text style={styles.notes}>{l.notes}</Text>}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No cook history yet. Log your first meal on the web app.</Text>
            </View>
          }
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
  title: { fontSize: 20, fontWeight: "700", color: "#fff", flex: 1 },
  count: { fontSize: 13, color: "#555" },
  card: {
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: "#1e1e24", borderRadius: 12, padding: 14,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between" },
  cardLeft: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: "flex-end" },
  recipeTitle: { fontSize: 15, fontWeight: "600", color: "#fff" },
  meta: { fontSize: 12, color: "#666", marginTop: 3 },
  stars: { fontSize: 13, color: "#f5a623", letterSpacing: 1 },
  noRepeat: { fontSize: 11, color: "#c44", marginTop: 3 },
  notes: { fontSize: 13, color: "#888", marginTop: 8, fontStyle: "italic" },
  empty: { color: "#555", fontSize: 15, textAlign: "center", paddingHorizontal: 32 },
});
