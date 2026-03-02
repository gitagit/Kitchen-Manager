import { notFound } from "next/navigation";

type Ingredient = {
  name: string;
  required: boolean;
  quantityText: string | null;
  preparation: string | null;
  substitutions: string[];
};

type Recipe = {
  id: string;
  title: string;
  cuisine: string | null;
  complexity: string;
  servings: number;
  servingsMax: number | null;
  handsOnMin: number;
  totalMin: number;
  difficulty: number;
  equipment: string[];
  tags: string[];
  seasons: string[];
  instructions: string;
  source: string;
  sourceRef: string | null;
  caloriesPerServing: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  ingredients: Ingredient[];
  techniques: string[];
};

function parseSteps(instructions: string): string[] {
  if (!instructions?.trim()) return [];
  const lines = instructions.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length > 1 && /^\d+\./.test(lines[0])) {
    return lines.map(l => l.replace(/^\d+\.\s*/, ""));
  }
  return instructions.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
}

export default async function PublicRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/recipes/${id}/public`, { cache: "no-store" });

  if (!res.ok) notFound();

  const { recipe }: { recipe: Recipe } = await res.json();
  const steps = parseSteps(recipe.instructions);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ fontSize: 12, opacity: 0.4, marginBottom: 4 }}>Shared from Mise en App</p>
      <h1 style={{ margin: "0 0 8px" }}>{recipe.title}</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {recipe.cuisine && <span style={tagStyle}>{recipe.cuisine}</span>}
        {recipe.complexity && <span style={tagStyle}>{recipe.complexity.toLowerCase()}</span>}
        {recipe.techniques.map(t => <span key={t} style={{ ...tagStyle, background: "rgba(100,150,255,0.15)" }}>{t}</span>)}
        {recipe.tags.map(t => <span key={t} style={tagStyle}>{t.toLowerCase()}</span>)}
      </div>

      <div style={{ display: "flex", gap: 20, fontSize: 14, opacity: 0.7, marginBottom: 20, flexWrap: "wrap" }}>
        <span>⏱ {recipe.totalMin} min total</span>
        <span>👐 {recipe.handsOnMin} min hands-on</span>
        <span>🍽 Serves {recipe.servings}{recipe.servingsMax ? `–${recipe.servingsMax}` : ""}</span>
        {recipe.equipment.length > 0 && <span>🔧 {recipe.equipment.join(", ").toLowerCase()}</span>}
      </div>

      {recipe.caloriesPerServing != null && (
        <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 16 }}>
          ~{recipe.caloriesPerServing} cal/serving
          {recipe.proteinG != null && <> · {recipe.proteinG}g protein</>}
          {recipe.carbsG != null && <> · {recipe.carbsG}g carbs</>}
          {recipe.fatG != null && <> · {recipe.fatG}g fat</>}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "start" }}>
        <div>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Ingredients</h2>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ fontSize: 14, opacity: ing.required ? 1 : 0.6 }}>
                {ing.quantityText ? <strong>{ing.quantityText} </strong> : ""}
                {ing.name}
                {ing.preparation ? `, ${ing.preparation}` : ""}
                {!ing.required && <em style={{ fontSize: 12 }}> (optional)</em>}
                {Array.isArray(ing.substitutions) && ing.substitutions.length > 0 && (
                  <span style={{ fontSize: 12, opacity: 0.55 }}> · or {ing.substitutions.join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Instructions</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            {steps.map((step, i) => (
              <li key={i} style={{ fontSize: 14, marginBottom: 8 }}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      {recipe.sourceRef && (
        <p style={{ marginTop: 24, fontSize: 12, opacity: 0.45 }}>
          Source: <a href={recipe.sourceRef} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>{recipe.sourceRef}</a>
        </p>
      )}
    </div>
  );
}

const tagStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 12,
  fontSize: 12,
  background: "rgba(127,127,127,0.12)",
};
