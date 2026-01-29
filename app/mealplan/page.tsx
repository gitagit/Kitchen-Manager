import MealPlanClient from "./ui";

export default function MealPlanPage() {
  return (
    <>
      <h1>Meal Plan</h1>
      <p><small className="muted">Plan your meals for the week. Click a slot to assign a recipe.</small></p>
      <MealPlanClient />
    </>
  );
}
