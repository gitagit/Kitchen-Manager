import SuggestClient from "./ui";

export default function SuggestPage() {
  return (
    <>
      <h1>Find a recipe</h1>
      <p><small className="muted">
        <strong>Find Recipes</strong> searches your saved library and ranks results by how well they fit your inventory, time, and preferences — no AI involved.&nbsp;
        <strong>Generate Recipe Ideas</strong> asks Claude to invent new recipes based on what you currently have on hand. Save the ones you like to grow your library.
      </small></p>
      <SuggestClient />
    </>
  );
}
