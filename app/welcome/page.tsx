import { Suspense } from "react";
import WelcomePage from "./WelcomePage";

export const metadata = { title: "Welcome — Mise en App" };

export default function Page() {
  return (
    <Suspense>
      <WelcomePage />
    </Suspense>
  );
}
