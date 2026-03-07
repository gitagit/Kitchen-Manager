import { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Switch, TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";

type Prefs = {
  defaultServings: number;
  defaultMaxTimeMin: number;
  wantVariety: boolean;
  wantGrowth: boolean;
  equipment: string[];
  dietaryTagsExclude: string[];
};

const ALL_EQUIPMENT = ["OVEN", "STOVETOP", "MICROWAVE", "SLOW_COOKER", "INSTANT_POT", "AIR_FRYER", "GRILL", "BLENDER"];
const EQUIP_LABEL: Record<string, string> = {
  OVEN: "Oven", STOVETOP: "Stovetop", MICROWAVE: "Microwave",
  SLOW_COOKER: "Slow Cooker", INSTANT_POT: "Instant Pot",
  AIR_FRYER: "Air Fryer", GRILL: "Grill", BLENDER: "Blender",
};

export default function PreferencesScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/preferences");
      if (!res.ok) { Alert.alert("Error", "Could not load preferences"); return; }
      const data = await res.json();
      setPrefs(data);
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!prefs) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/preferences", {
        method: "PUT",
        body: JSON.stringify(prefs),
      });
      if (!res.ok) { Alert.alert("Error", "Could not save preferences"); return; }
      Alert.alert("Saved", "Preferences updated.");
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setSaving(false);
    }
  }

  function toggleEquipment(key: string) {
    if (!prefs) return;
    const has = prefs.equipment.includes(key);
    setPrefs({ ...prefs, equipment: has ? prefs.equipment.filter(e => e !== key) : [...prefs.equipment, key] });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Preferences</Text>
        {prefs && (
          <TouchableOpacity onPress={save} disabled={saving} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4a90d9" size="large" />
        </View>
      ) : !prefs ? null : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.sectionLabel}>Defaults</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Default servings</Text>
              <TextInput
                style={styles.numInput}
                value={String(prefs.defaultServings)}
                onChangeText={v => setPrefs({ ...prefs, defaultServings: parseInt(v) || 2 })}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Max cook time (min)</Text>
              <TextInput
                style={styles.numInput}
                value={String(prefs.defaultMaxTimeMin)}
                onChangeText={v => setPrefs({ ...prefs, defaultMaxTimeMin: parseInt(v) || 45 })}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Suggestions</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Want variety</Text>
              <Switch
                value={prefs.wantVariety}
                onValueChange={v => setPrefs({ ...prefs, wantVariety: v })}
                trackColor={{ true: "#4a90d9" }}
              />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Want to grow skills</Text>
              <Switch
                value={prefs.wantGrowth}
                onValueChange={v => setPrefs({ ...prefs, wantGrowth: v })}
                trackColor={{ true: "#4a90d9" }}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Available Equipment</Text>
          <View style={styles.card}>
            {ALL_EQUIPMENT.map((key, i) => (
              <View key={key} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={styles.rowLabel}>{EQUIP_LABEL[key]}</Text>
                <Switch
                  value={prefs.equipment.includes(key)}
                  onValueChange={() => toggleEquipment(key)}
                  trackColor={{ true: "#4a90d9" }}
                />
              </View>
            ))}
          </View>

          {prefs.dietaryTagsExclude.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Dietary Exclusions</Text>
              <View style={styles.card}>
                <Text style={styles.tagList}>{prefs.dietaryTagsExclude.join(", ")}</Text>
                <Text style={styles.hint}>Edit dietary exclusions on the web app.</Text>
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
  title: { fontSize: 20, fontWeight: "700", color: "#fff", flex: 1 },
  saveBtn: {
    backgroundColor: "#4a90d920", borderColor: "#4a90d960", borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
  },
  saveBtnText: { color: "#4a90d9", fontWeight: "600", fontSize: 14 },
  sectionLabel: {
    fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 1,
    marginHorizontal: 16, marginTop: 20, marginBottom: 8,
  },
  card: {
    marginHorizontal: 12, backgroundColor: "#1e1e24", borderRadius: 12, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 13,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: "#2e2e38" },
  rowLabel: { fontSize: 15, color: "#fff" },
  numInput: {
    backgroundColor: "#2e2e38", borderRadius: 8, color: "#fff",
    paddingHorizontal: 12, paddingVertical: 6, fontSize: 15,
    minWidth: 60, textAlign: "right",
  },
  tagList: { fontSize: 14, color: "#aaa", paddingHorizontal: 14, paddingTop: 13 },
  hint: { fontSize: 12, color: "#555", paddingHorizontal: 14, paddingVertical: 8 },
});
