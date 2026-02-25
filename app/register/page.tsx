import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Create account — Mise en App" };

export default function RegisterPage() {
  const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID);
  const hasGithub = !!(process.env.GITHUB_CLIENT_ID);

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: "0 16px" }}>
      <div className="card">
        <h2 style={{ marginBottom: 4 }}>🍳 Mise en App</h2>
        <p style={{ marginBottom: 20 }}>
          <small className="muted">Create your account to get started.</small>
        </p>
        <Suspense>
          <RegisterForm hasGoogle={hasGoogle} hasGithub={hasGithub} />
        </Suspense>
      </div>
    </div>
  );
}
