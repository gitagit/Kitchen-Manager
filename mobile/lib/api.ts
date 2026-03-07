import { getToken } from "./auth";

// Point to your deployed API. For local dev, use your machine's LAN IP.
// e.g. "http://192.168.1.x:3000" for local, "https://mise-en-app.vercel.app" for prod.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://mise-en-app.vercel.app";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = await authHeaders();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...headers, ...(init.headers ?? {}) },
  });
}

/** POST multipart/form-data (for photo capture — no Content-Type header, browser sets boundary). */
export async function apiUpload(path: string, body: FormData): Promise<Response> {
  const headers = await authHeaders();
  return fetch(`${API_BASE}${path}`, { method: "POST", headers, body });
}
