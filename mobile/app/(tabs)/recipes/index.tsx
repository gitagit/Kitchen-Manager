import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth";

type Ingredient = { id: string; name: string; required: boolean; quantityText: string | null };
type Recipe = {
  id: string;
  title: string;
  cuisine: string | null;
  totalMin: number | null;
  difficulty: number;
  servings: number;
  tags: string[];
  caloriesPerServing: number | null;
  ingredients: Ingredient[];
  cookLogs: { id: string }[];
};

export default function RecipesScreen() {
  const { signOut } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/recipes");
      if (res.status === 401) { await signOut(); return; }
      const data = await res.json();
      setRecipes(data.recipes ?? []);
    } catch {
      Alert.alert("Error", "Could not load recipes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut]);

  useEffect(() => { load(); }, [load]);

  const filtered = recipes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.cuisine ?? "").toLowerCase().includes(search.toLowerCase()) ||
    r.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  function difficultyLabel(d: number) {
    return ["", "Easy", "Easy+", "Medium", "Hard", "Expert"][d] ?? String(d);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4a90d9" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📖 Recipes</Text>
        <Text style={styles.count}>{recipes.length}</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search recipes, cuisine, tags…"
        placeholderTextColor="#555"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#4a90d9" />
        }
        renderItem={({ item: r }) => {
          const expanded = expandedId === r.id;
          const required = r.ingredients.filter(i => i.required);
          const optional = r.ingredients.filter(i => !i.required);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => setExpandedId(expanded ? null : r.id)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  {r.cookLogs.length > 0 && (
                    <Text style={styles.cooked}>✓ {r.cookLogs.length}x</Text>
                  )}
                </View>
                <Text style={styles.cardMeta}>
                  {[
                    r.cuisine,
                    r.totalMin ? `${r.totalMin}m` : null,
                    difficultyLabel(r.difficulty),
                    r.servings ? `serves ${r.servings}` : null,
                  ].filter(Boolean).join(" · ")}
                </Text>
                {r.tags.length > 0 && (
                  <Text style={styles.tags}>{r.tags.slice(0, 4).join(", ")}</Text>
                )}
              </View>

              {expanded && (
                <View style={styles.expanded}>
                  {r.caloriesPerServing && (
                    <Text style={styles.calories}>{r.caloriesPerServing} cal/serving</Text>
                  )}
                  {required.length > 0 && (
                    <>
                      <Text style={styles.ingHeader}>Ingredients</Text>
                      {required.map(i => (
                        <Text key={i.id} style={styles.ing}>
                          • {i.quantityText ? `${i.quantityText} ` : ""}{i.name}
                        </Text>
                      ))}
                    </>
                  )}
                  {optional.length > 0 && (
                    <>
                      <Text style={[styles.ingHeader, { marginTop: 8 }]}>Optional</Text>
                      {optional.map(i => (
                        <Text key={i.id} style={[styles.ing, { opacity: 0.55 }]}>
                          • {i.quantityText ? `${i.quantityText} ` : ""}{i.name}
                        </Text>
                      ))}
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>
              {search ? "No recipes match your search." : "No recipes yet. Add some on the web app."}
            </Text>
          </View>
        }
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f12" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  count: { fontSize: 14, color: "#555" },
  search: {
    margin: 12,
    backgroundColor: "#1e1e24",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#fff",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2e2e38",
  },
  card: {
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: "#1e1e24",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardHeader: { padding: 14 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#fff", flex: 1, marginRight: 8 },
  cooked: { fontSize: 12, color: "#4a90d9" },
  cardMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  tags: { fontSize: 11, color: "#555", marginTop: 3 },
  expanded: {
    borderTopWidth: 1, borderTopColor: "#2e2e38",
    paddingHorizontal: 14, paddingBottom: 14, paddingTop: 10,
  },
  calories: { fontSize: 12, color: "#888", marginBottom: 8 },
  ingHeader: { fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  ing: { fontSize: 13, color: "#ccc", lineHeight: 20 },
  empty: { color: "#555", fontSize: 15, textAlign: "center", paddingHorizontal: 32 },
});
