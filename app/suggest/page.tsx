import SuggestClient from "./ui";

export default function SuggestPage() {
  return (
    <>
      <h1>Suggest dinner</h1>
      <p><small className="muted">Rank recipes by ingredient coverage, time fit, expiring items, and your ratings.</small></p>
      <SuggestClient />
    </>
  );
}
