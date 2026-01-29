import InventoryClient from "./ui";

export default function InventoryPage() {
  return (
    <>
      <h1>Inventory</h1>
      <p><small className="muted">MVP: track pantry/spices/frozen first. Produce/meat can be loose early.</small></p>
      <InventoryClient />
    </>
  );
}
