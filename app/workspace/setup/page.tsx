import { Suspense } from "react";
import WorkspaceSetup from "./WorkspaceSetup";

export const metadata = { title: "Set up workspace — Mise en App" };

export default function WorkspaceSetupPage() {
  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
      <div className="card">
        <h2 style={{ marginBottom: 4 }}>Welcome to Mise en App</h2>
        <p style={{ marginBottom: 20 }}>
          <small className="muted">
            Create a new workspace for your kitchen, or join an existing one with an invite code.
          </small>
        </p>
        <Suspense>
          <WorkspaceSetup />
        </Suspense>
      </div>
    </div>
  );
}
