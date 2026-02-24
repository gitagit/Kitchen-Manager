import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in — Mise en App" };

export default function LoginPage() {
  const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID);
  const hasGithub = !!(process.env.GITHUB_CLIENT_ID);

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", padding: "0 16px" }}>
      <div className="card">
        <h2 style={{ marginBottom: 4 }}>🍳 Mise en App</h2>
        <p style={{ marginBottom: 20 }}>
          <small className="muted">Sign in to continue.</small>
        </p>
        <Suspense>
          <LoginForm hasGoogle={hasGoogle} hasGithub={hasGithub} />
        </Suspense>
      </div>
    </div>
  );
}
