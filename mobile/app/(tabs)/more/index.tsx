import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAuth } from "@/context/auth";

export default function MoreScreen() {
  const { user, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>☰ More</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.workspaceId && (
            <Text style={styles.workspace}>Workspace: {user.workspaceId.slice(0, 8)}…</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Coming soon</Text>
        {["Recipes", "Meal Plan", "Cook History", "Stats", "Preferences"].map(label => (
          <View key={label} style={[styles.card, { opacity: 0.4 }]}>
            <Text style={styles.menuItem}>{label}</Text>
            <Text style={styles.soon}>Phase 2</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f12" },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionLabel: { fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  card: {
    backgroundColor: "#1e1e24",
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  email: { fontSize: 15, color: "#fff" },
  workspace: { fontSize: 12, color: "#555", marginTop: 4 },
  menuItem: { fontSize: 15, color: "#fff" },
  soon: { fontSize: 12, color: "#444" },
  signOutBtn: {
    backgroundColor: "#1e1e24",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c4433330",
  },
  signOutText: { color: "#c44", fontWeight: "600", fontSize: 15 },
});
