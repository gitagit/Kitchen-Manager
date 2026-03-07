import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Switch, TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { apiUpload, apiFetch } from "@/lib/api";

type ScannedItem = {
  name: string;
  category: string;
  location: string;
  quantityText: string;
  keep: boolean;
};

const CATEGORIES = ["PANTRY","SPICE","SEAFOOD","PRODUCE","MEAT","DAIRY","CONDIMENT","BAKING","BEVERAGE","PREPARED","OTHER"];
const LOCATIONS = ["PANTRY","FRIDGE","FREEZER","COUNTER","OTHER"];

export default function CaptureScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<{ uri: string }[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, { uri: result.assets[0].uri }].slice(0, 5));
      setScannedItems([]);
    }
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.map(a => ({ uri: a.uri }));
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
      setScannedItems([]);
    }
  }

  async function runScan() {
    if (!photos.length) return;
    setScanning(true);
    setScannedItems([]);
    try {
      const fd = new FormData();
      for (const photo of photos) {
        const filename = photo.uri.split("/").pop() ?? "photo.jpg";
        // @ts-ignore — React Native FormData accepts { uri, name, type }
        fd.append("images", { uri: photo.uri, name: filename, type: "image/jpeg" });
      }
      const res = await apiUpload("/api/inventory/capture", fd);
      const data = await res.json();
      if (!res.ok) { Alert.alert("Scan failed", data.error ?? "Unknown error"); return; }
      const items: ScannedItem[] = (data.items ?? []).map((it: Record<string, string>) => ({
        name: it.name ?? "",
        category: CATEGORIES.includes(it.category) ? it.category : "OTHER",
        location: LOCATIONS.includes(it.location) ? it.location : "PANTRY",
        quantityText: it.quantityText ?? "1",
        keep: true,
      }));
      setScannedItems(items);
      if (items.length === 0) Alert.alert("No items detected", "Try a clearer photo.");
    } catch {
      Alert.alert("Error", "Network error during scan");
    } finally {
      setScanning(false);
    }
  }

  function updateItem(idx: number, patch: Partial<ScannedItem>) {
    setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  async function saveItems() {
    const toAdd = scannedItems.filter(it => it.keep && it.name.trim());
    if (!toAdd.length) { router.back(); return; }
    setSaving(true);
    let added = 0;
    for (const it of toAdd) {
      const res = await apiFetch("/api/inventory/items", {
        method: "POST",
        body: JSON.stringify({
          item: { name: it.name.trim(), category: it.category, location: it.location },
          batch: { quantityText: it.quantityText },
        }),
      });
      if (res.ok) added++;
    }
    setSaving(false);
    Alert.alert("Done", `Added ${added} item${added !== 1 ? "s" : ""} to inventory.`, [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  const keepCount = scannedItems.filter(it => it.keep).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📷 Scan Pantry</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Photo strip */}
        {photos.length > 0 && (
          <ScrollView horizontal style={styles.photoStrip} showsHorizontalScrollIndicator={false}>
            {photos.map((p, i) => (
              <View key={i} style={styles.thumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.thumb} contentFit="cover" />
                <TouchableOpacity
                  style={styles.thumbRemove}
                  onPress={() => { setPhotos(prev => prev.filter((_, j) => j !== i)); setScannedItems([]); }}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Buttons */}
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={pickPhoto} disabled={photos.length >= 5}>
            <Text style={styles.btnText}>📷 Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={pickFromLibrary} disabled={photos.length >= 5}>
            <Text style={[styles.btnText, { color: "#aaa" }]}>🖼 Library</Text>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && scannedItems.length === 0 && (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, { marginTop: 8 }]}
            onPress={runScan}
            disabled={scanning}
          >
            {scanning
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>🔍 Analyze {photos.length} photo{photos.length !== 1 ? "s" : ""}</Text>}
          </TouchableOpacity>
        )}

        {scanning && (
          <Text style={styles.hint}>Analyzing… this may take 15–30 seconds</Text>
        )}

        {/* Results */}
        {scannedItems.length > 0 && (
          <View style={styles.results}>
            <Text style={styles.resultsTitle}>
              {keepCount} item{keepCount !== 1 ? "s" : ""} detected — toggle to remove
            </Text>
            {scannedItems.map((it, i) => (
              <View key={i} style={[styles.resultItem, !it.keep && styles.resultItemDimmed]}>
                <Switch
                  value={it.keep}
                  onValueChange={v => updateItem(i, { keep: v })}
                  trackColor={{ true: "#4a90d9" }}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <TextInput
                    value={it.name}
                    onChangeText={v => updateItem(i, { name: v })}
                    style={styles.resultName}
                  />
                  <Text style={styles.resultMeta}>
                    {it.category} · {it.location} · {it.quantityText}
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { marginTop: 16 }]}
              onPress={saveItems}
              disabled={saving || keepCount === 0}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Add {keepCount} item{keepCount !== 1 ? "s" : ""} →</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 10, alignItems: "center" }} onPress={() => router.back()}>
              <Text style={{ color: "#555", fontSize: 14 }}>Skip — don't add</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f12" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  back: { color: "#4a90d9", fontSize: 16, width: 60 },
  title: { fontSize: 18, fontWeight: "700", color: "#fff" },
  body: { padding: 16, paddingBottom: 48 },
  photoStrip: { marginBottom: 14 },
  thumbWrap: { position: "relative", marginRight: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  thumbRemove: {
    position: "absolute", top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(200,50,50,0.9)",
    alignItems: "center", justifyContent: "center",
  },
  row: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#4a90d920", borderWidth: 1, borderColor: "#4a90d960" },
  btnSecondary: { backgroundColor: "#1e1e24", borderWidth: 1, borderColor: "#2e2e38" },
  btnText: { color: "#4a90d9", fontWeight: "600", fontSize: 15 },
  hint: { color: "#555", fontSize: 13, textAlign: "center", marginTop: 10 },
  results: { marginTop: 20 },
  resultsTitle: { color: "#888", fontSize: 13, marginBottom: 10 },
  resultItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1e1e24",
  },
  resultItemDimmed: { opacity: 0.35 },
  resultName: { color: "#fff", fontSize: 15, fontWeight: "500" },
  resultMeta: { color: "#666", fontSize: 12, marginTop: 2 },
});
