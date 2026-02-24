import { Suspense } from "react";
import JoinPage from "./JoinPage";

export const metadata = { title: "Join workspace — Mise en App" };

export default function JoinWorkspacePage() {
  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>Join Workspace</h2>
        <Suspense>
          <JoinPage />
        </Suspense>
      </div>
    </div>
  );
}
