import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0f0f12", borderTopColor: "#1e1e24" },
        tabBarActiveTintColor: "#4a90d9",
        tabBarInactiveTintColor: "#555",
      }}
    >
      <Tabs.Screen
        name="inventory/index"
        options={{ title: "Inventory", tabBarIcon: () => <TabIcon label="📦" /> }}
      />
      <Tabs.Screen
        name="recipes/index"
        options={{ title: "Recipes", tabBarIcon: () => <TabIcon label="📖" /> }}
      />
      <Tabs.Screen
        name="suggest/index"
        options={{ title: "Suggest", tabBarIcon: () => <TabIcon label="✨" /> }}
      />
      <Tabs.Screen
        name="grocery/index"
        options={{ title: "Grocery", tabBarIcon: () => <TabIcon label="🛒" /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: () => <TabIcon label="☰" /> }}
      />
    </Tabs>
  );
}
