import { Suspense } from "react";
import OnboardingWizard from "./OnboardingWizard";

export default function OnboardPage() {
  return (
    <Suspense>
      <OnboardingWizard />
    </Suspense>
  );
}
