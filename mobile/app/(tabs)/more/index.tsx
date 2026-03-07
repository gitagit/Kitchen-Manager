import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/auth";

const MENU_ITEMS = [
  { label: "Meal Plan", emoji: "📅", route: "/meal-plan" },
  { label: "Cook History", emoji: "📋", route: "/history" },
  { label: "Stats", emoji: "📊", route: "/stats" },
  { label: "Preferences", emoji: "⚙️", route: "/preferences" },
] as const;

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.card}>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.workspaceId && (
          <Text style={styles.workspace}>Workspace: {user.workspaceId.slice(0, 8)}…</Text>
        )}
      </View>

      <Text style={styles.sectionLabel}>Kitchen</Text>
      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuRow, i > 0 && styles.menuRowBorder]}
            onPress={() => router.push(`/(tabs)/more${item.route}` as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.menuEmoji}>{item.emoji}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Session</Text>
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f12" },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  sectionLabel: {
    fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 1,
    marginHorizontal: 16, marginTop: 20, marginBottom: 8,
  },
  card: {
    marginHorizontal: 12, backgroundColor: "#1e1e24", borderRadius: 12, padding: 14,
  },
  email: { fontSize: 15, color: "#fff" },
  workspace: { fontSize: 12, color: "#555", marginTop: 4 },
  menuCard: {
    marginHorizontal: 12, backgroundColor: "#1e1e24", borderRadius: 12, overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 14,
  },
  menuRowBorder: { borderTopWidth: 1, borderTopColor: "#2e2e38" },
  menuEmoji: { fontSize: 18, marginRight: 12, width: 26 },
  menuLabel: { flex: 1, fontSize: 15, color: "#fff" },
  menuChevron: { fontSize: 18, color: "#444" },
  signOutBtn: {
    marginHorizontal: 12, backgroundColor: "#1e1e24", borderRadius: 12,
    padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#c4433330",
  },
  signOutText: { color: "#c44", fontWeight: "600", fontSize: 15 },
});
