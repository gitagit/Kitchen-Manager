import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in — Mise en App" };

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: "0 16px" }}>
      <div className="card">
        <h2 style={{ marginBottom: 4 }}>🍳 Mise en App</h2>
        <p style={{ marginBottom: 20 }}>
          <small className="muted">Enter your site password to continue.</small>
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
