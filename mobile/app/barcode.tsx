import { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, TextInput, ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";

type ProductInfo = {
  name: string;
  brand: string | null;
  category: string;
  quantityText: string;
};

const CATEGORY_MAP: Record<string, string> = {
  "en:beverages": "BEVERAGE",
  "en:dairies": "DAIRY",
  "en:meats": "MEAT",
  "en:seafood": "SEAFOOD",
  "en:snacks": "PANTRY",
  "en:cereals-and-potatoes": "PANTRY",
  "en:fruits-and-vegetables": "PRODUCE",
  "en:condiments": "CONDIMENT",
  "en:spices": "SPICE",
};

function inferCategory(categories: string): string {
  const lower = categories.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  if (lower.includes("spice") || lower.includes("seasoning")) return "SPICE";
  if (lower.includes("sauce") || lower.includes("condiment")) return "CONDIMENT";
  if (lower.includes("dairy") || lower.includes("cheese") || lower.includes("milk")) return "DAIRY";
  if (lower.includes("meat") || lower.includes("poultry")) return "MEAT";
  if (lower.includes("fish") || lower.includes("seafood")) return "SEAFOOD";
  if (lower.includes("beverage") || lower.includes("drink") || lower.includes("juice")) return "BEVERAGE";
  if (lower.includes("fruit") || lower.includes("vegetable")) return "PRODUCE";
  return "PANTRY";
}

function categoryToLocation(cat: string): string {
  switch (cat) {
    case "PRODUCE": case "DAIRY": case "MEAT": case "SEAFOOD": case "PREPARED":
      return "FRIDGE";
    default:
      return "PANTRY";
  }
}

export default function BarcodeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [looking, setLooking] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const lastScannedRef = useRef("");

  async function handleBarcode({ data }: { data: string }) {
    if (scanned || looking || data === lastScannedRef.current) return;
    lastScannedRef.current = data;
    setScanned(true);
    setLooking(true);

    try {
      // Look up via Open Food Facts (free, no API key)
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(data)}.json`,
        { headers: { "User-Agent": "MiseEnApp/1.0" } }
      );
      const json = await res.json();

      if (json.status === 1 && json.product) {
        const p = json.product;
        const name = (p.product_name || p.product_name_en || "Unknown product").toLowerCase();
        const brand = p.brands || null;
        const qty = p.quantity || "1";
        const categories = p.categories || "";
        const cat = inferCategory(categories);

        const info: ProductInfo = { name, brand, category: cat, quantityText: qty };
        setProduct(info);
        setEditName(brand ? `${brand.toLowerCase()} ${name}` : name);
      } else {
        Alert.alert("Not found", `Barcode ${data} not found in database. Try entering manually.`);
        setScanned(false);
      }
    } catch {
      Alert.alert("Error", "Could not look up barcode. Check your connection.");
      setScanned(false);
    } finally {
      setLooking(false);
    }
  }

  async function saveProduct() {
    if (!product || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/inventory/items", {
        method: "POST",
        body: JSON.stringify({
          item: {
            name: editName.trim(),
            category: product.category,
            location: categoryToLocation(product.category),
          },
          batch: { quantityText: product.quantityText },
        }),
      });
      if (res.ok) {
        Alert.alert("Added", `${editName.trim()} added to inventory.`, [
          { text: "Scan another", onPress: resetScan },
          { text: "Done", onPress: () => router.back() },
        ]);
      } else {
        const data = await res.json();
        Alert.alert("Error", data.error ?? "Could not save item");
      }
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setSaving(false);
    }
  }

  function resetScan() {
    setScanned(false);
    setProduct(null);
    setEditName("");
    lastScannedRef.current = "";
  }

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color="#4a90d9" size="large" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera permission is needed to scan barcodes</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Barcode Scan</Text>
        <View style={{ width: 60 }} />
      </View>

      {!product ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
            onBarcodeScanned={scanned && !looking ? undefined : handleBarcode}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
          </View>
          {looking && (
            <View style={styles.lookingOverlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.lookingText}>Looking up product…</Text>
            </View>
          )}
          <Text style={styles.hint}>Point camera at a barcode</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.resultBody}>
          <Text style={styles.resultLabel}>Product found</Text>
          <TextInput
            style={styles.nameInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Item name"
            placeholderTextColor="#555"
          />
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{product.category}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{categoryToLocation(product.category)}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{product.quantityText}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={saveProduct} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Add to Inventory</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.scanAgain} onPress={resetScan}>
            <Text style={styles.scanAgainText}>Scan another</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f12" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f0f12", padding: 24 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  back: { color: "#4a90d9", fontSize: 16, width: 60 },
  title: { fontSize: 18, fontWeight: "700", color: "#fff" },
  cameraWrap: { flex: 1, position: "relative" },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center", alignItems: "center",
  },
  scanFrame: {
    width: 250, height: 150, borderWidth: 2, borderColor: "#4a90d9",
    borderRadius: 12, backgroundColor: "transparent",
  },
  lookingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center",
  },
  lookingText: { color: "#fff", fontSize: 15, marginTop: 12 },
  hint: { color: "#666", fontSize: 13, textAlign: "center", paddingVertical: 12 },
  permText: { color: "#aaa", fontSize: 16, textAlign: "center", marginBottom: 16 },
  permBtn: { backgroundColor: "#4a90d9", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  permBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  backLink: { color: "#4a90d9", fontSize: 15 },
  resultBody: { padding: 20 },
  resultLabel: { color: "#888", fontSize: 13, marginBottom: 8 },
  nameInput: {
    backgroundColor: "#1e1e24", borderRadius: 10, padding: 14,
    color: "#fff", fontSize: 17, fontWeight: "600",
    borderWidth: 1, borderColor: "#2e2e38", marginBottom: 12,
  },
  metaRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  metaChip: { backgroundColor: "#1e1e24", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  metaText: { color: "#888", fontSize: 12, fontWeight: "500" },
  saveBtn: {
    backgroundColor: "#4a90d9", paddingVertical: 15, borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  scanAgain: { marginTop: 14, alignItems: "center" },
  scanAgainText: { color: "#4a90d9", fontSize: 15 },
});
