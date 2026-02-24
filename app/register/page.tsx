import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Create account — Mise en App" };

export default function RegisterPage() {
  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: "0 16px" }}>
      <div className="card">
        <h2 style={{ marginBottom: 4 }}>🍳 Mise en App</h2>
        <p style={{ marginBottom: 20 }}>
          <small className="muted">Create your account to get started.</small>
        </p>
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
