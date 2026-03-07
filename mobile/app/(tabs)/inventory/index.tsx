import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth";

type Item = {
  id: string;
  name: string;
  category: string;
  location: string;
  batches: { id: string; quantityText: string }[];
};

const CATEGORY_EMOJI: Record<string, string> = {
  PRODUCE: "🥦", MEAT: "🥩", SEAFOOD: "🐟", DAIRY: "🧀", PANTRY: "🥫",
  SPICE: "🫙", CONDIMENT: "🍶", BAKING: "🧁", BEVERAGE: "🥤",
  PREPARED: "🍱", OTHER: "📦",
};

export default function InventoryScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/inventory/items");
      if (res.status === 401) { await signOut(); return; }
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      Alert.alert("Error", "Could not load inventory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

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
        <Text style={styles.title}>📦 Inventory</Text>
        <TouchableOpacity
          style={styles.cameraBtn}
          onPress={() => router.push("/capture")}
        >
          <Text style={styles.cameraBtnText}>📷 Scan</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search items…"
        placeholderTextColor="#555"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#4a90d9" />
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemEmoji}>
              {CATEGORY_EMOJI[item.category] ?? "📦"}
            </Text>
            <View style={styles.itemBody}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                {item.batches[0]?.quantityText ?? "—"} · {item.location.toLowerCase()}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>
              {search ? "No items match your search." : "No inventory yet. Tap 📷 Scan to add items."}
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
  cameraBtn: {
    backgroundColor: "#4a90d920",
    borderColor: "#4a90d960",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cameraBtnText: { color: "#4a90d9", fontWeight: "600", fontSize: 14 },
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
  item: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#1e1e24",
  },
  itemEmoji: { fontSize: 24, marginRight: 12 },
  itemBody: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "500", color: "#fff" },
  itemMeta: { fontSize: 12, color: "#666", marginTop: 2 },
  empty: { color: "#555", fontSize: 15, textAlign: "center", paddingHorizontal: 32 },
});
