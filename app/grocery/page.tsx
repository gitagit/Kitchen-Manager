import GroceryClient from "./ui";

export default function GroceryPage() {
  return (
    <>
      <h1>Grocery</h1>
      <p><small className="muted">Generate a list from selected recipes (later: add below-par staples + expiring logic).</small></p>
      <GroceryClient />
    </>
  );
}
