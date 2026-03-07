import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput,
} from "react-native";
import { apiFetch } from "@/lib/api";

type GroceryItem = {
  id: string;
  name: string;
  channel: string;
  quantityText: string | null;
  reason: string;
  priority: number;
  acquired: boolean;
  category?: string;
};

const PRIORITY_LABEL: Record<number, string> = { 1: "Need", 2: "Want", 3: "Nice" };
const PRIORITY_COLOR: Record<number, string> = { 1: "#e05", 2: "#4a90d9", 3: "#555" };

export default function GroceryScreen() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/grocery/plan");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      Alert.alert("Error", "Could not load grocery list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleAcquired(item: GroceryItem) {
    const updated = items.map(i => i.id === item.id ? { ...i, acquired: !i.acquired } : i);
    setItems(updated);
    await apiFetch("/api/grocery/plan", {
      method: "POST",
      body: JSON.stringify({
        items: updated.map(i => ({
          name: i.name,
          channel: i.channel,
          quantityText: i.quantityText,
          reason: i.reason,
          priority: i.priority,
          acquired: i.acquired,
        })),
      }),
    });
  }

  async function addItem() {
    if (!newItem.trim()) return;
    setAdding(true);
    const updated = [
      ...items,
      { id: Date.now().toString(), name: newItem.trim(), channel: "EITHER", quantityText: null, reason: "manual", priority: 2, acquired: false },
    ];
    await apiFetch("/api/grocery/plan", {
      method: "POST",
      body: JSON.stringify({
        items: updated.map(i => ({
          name: i.name, channel: i.channel, quantityText: i.quantityText,
          reason: i.reason, priority: i.priority, acquired: i.acquired,
        })),
      }),
    });
    setNewItem("");
    setAdding(false);
    load();
  }

  const pending = items.filter(i => !i.acquired);
  const done = items.filter(i => i.acquired);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#4a90d9" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Grocery</Text>
        <Text style={styles.count}>{pending.length} remaining</Text>
      </View>

      {/* Add item */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Add item…"
          placeholderTextColor="#555"
          value={newItem}
          onChangeText={setNewItem}
          returnKeyType="done"
          onSubmitEditing={addItem}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={adding || !newItem.trim()}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...pending, ...done]}
        keyExtractor={i => i.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#4a90d9" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => toggleAcquired(item)}>
            <View style={[styles.check, item.acquired && styles.checkDone]}>
              {item.acquired && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
            </View>
            <View style={styles.itemBody}>
              <Text style={[styles.itemName, item.acquired && styles.itemDone]}>{item.name}</Text>
              {item.quantityText && (
                <Text style={styles.itemMeta}>{item.quantityText}</Text>
              )}
            </View>
            <Text style={[styles.priority, { color: PRIORITY_COLOR[item.priority] }]}>
              {PRIORITY_LABEL[item.priority]}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>Your grocery list is empty.</Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 24 }}
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
  count: { fontSize: 14, color: "#666" },
  addRow: { flexDirection: "row", marginHorizontal: 12, marginBottom: 8, gap: 8 },
  addInput: {
    flex: 1, backgroundColor: "#1e1e24", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, color: "#fff", fontSize: 15,
    borderWidth: 1, borderColor: "#2e2e38",
  },
  addBtn: {
    width: 44, backgroundColor: "#4a90d9", borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 22, fontWeight: "300" },
  item: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#1e1e24",
  },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: "#333",
    marginRight: 12, alignItems: "center", justifyContent: "center",
  },
  checkDone: { backgroundColor: "#4a90d9", borderColor: "#4a90d9" },
  itemBody: { flex: 1 },
  itemName: { fontSize: 15, color: "#fff" },
  itemDone: { color: "#444", textDecorationLine: "line-through" },
  itemMeta: { fontSize: 12, color: "#555", marginTop: 2 },
  priority: { fontSize: 12, fontWeight: "600" },
  empty: { color: "#555", fontSize: 15 },
});
