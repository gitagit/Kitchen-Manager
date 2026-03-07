import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useAuth } from "@/context/auth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    const error = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) Alert.alert("Login failed", error);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🍳</Text>
        <Text style={styles.title}>Mise en App</Text>
        <Text style={styles.subtitle}>Sign in to your kitchen</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.button, (!email || !password || loading) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={!email || !password || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f12" },
  inner: {
    flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 12,
  },
  logo: { fontSize: 52, textAlign: "center", marginBottom: 4 },
  title: {
    fontSize: 28, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 2,
  },
  subtitle: { fontSize: 15, color: "#888", textAlign: "center", marginBottom: 16 },
  input: {
    backgroundColor: "#1e1e24",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2e2e38",
  },
  button: {
    backgroundColor: "#4a90d9",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
