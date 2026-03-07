import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter, useSegments } from "expo-router";
import { saveAuth, clearAuth, getStoredUser, getToken, type StoredUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type AuthState = {
  user: StoredUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null, token: null, loading: true,
  signIn: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Restore session on mount
  useEffect(() => {
    (async () => {
      const [t, u] = await Promise.all([getToken(), getStoredUser()]);
      setToken(t);
      setUser(u);
      setLoading(false);
    })();
  }, []);

  // Route guard: redirect based on auth state
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) router.replace("/(auth)/login");
    if (user && inAuth) router.replace("/(tabs)/inventory");
  }, [user, loading, segments, router]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const res = await apiFetch("/api/auth/mobile", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Login failed";
    await saveAuth(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
