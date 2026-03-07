import { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { apiFetch } from "@/lib/api";

type SuggestResult = {
  recipe: { id: string; title: string; totalMin: number; difficulty: number; cuisine: string | null };
  score: number;
  matchedRequired: number;
  totalRequired: number;
  missingRequired: string[];
};

export default function SuggestScreen() {
  const [results, setResults] = useState<SuggestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const suggest = useCallback(async () => {
    setLoading(true);
    setRan(true);
    try {
      const res = await apiFetch("/api/suggest", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert("Error", data.error ?? "Suggest failed"); return; }
      setResults(data.results ?? []);
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✨ Suggest</Text>
      </View>

      {!ran ? (
        <View style={styles.center}>
          <Text style={styles.prompt}>What can you make tonight?</Text>
          <TouchableOpacity style={styles.btn} onPress={suggest}>
            <Text style={styles.btnText}>Find recipes →</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4a90d9" size="large" />
          <Text style={styles.hint}>Checking your pantry…</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={r => r.recipe.id}
          ListHeaderComponent={
            <TouchableOpacity style={[styles.btn, { margin: 12 }]} onPress={suggest}>
              <Text style={styles.btnText}>Refresh suggestions</Text>
            </TouchableOpacity>
          }
          renderItem={({ item: r }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{r.recipe.title}</Text>
              <Text style={styles.cardMeta}>
                {r.recipe.totalMin}m · difficulty {r.recipe.difficulty}
                {r.recipe.cuisine ? ` · ${r.recipe.cuisine}` : ""}
              </Text>
              <View style={styles.matchBar}>
                <View style={[styles.matchFill, { width: `${Math.round((r.matchedRequired / Math.max(r.totalRequired, 1)) * 100)}%` }]} />
              </View>
              <Text style={styles.matchText}>
                {r.matchedRequired}/{r.totalRequired} ingredients matched
                {r.missingRequired.length > 0 && ` · missing: ${r.missingRequired.slice(0, 3).join(", ")}`}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>No recipes matched your inventory. Add more items or recipes.</Text>
            </View>
          }
          contentContainerStyle={results.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f12" },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  prompt: { fontSize: 18, color: "#aaa", marginBottom: 20, textAlign: "center" },
  hint: { color: "#555", marginTop: 12 },
  empty: { color: "#555", fontSize: 15, textAlign: "center" },
  btn: {
    backgroundColor: "#4a90d920",
    borderColor: "#4a90d960",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnText: { color: "#4a90d9", fontWeight: "600", fontSize: 15 },
  card: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#1e1e24",
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#fff", marginBottom: 4 },
  cardMeta: { fontSize: 13, color: "#666", marginBottom: 8 },
  matchBar: { height: 4, backgroundColor: "#2e2e38", borderRadius: 2, marginBottom: 5 },
  matchFill: { height: 4, backgroundColor: "#4a90d9", borderRadius: 2 },
  matchText: { fontSize: 12, color: "#666" },
});
