/**
 * Compare recipe generation quality between claude-sonnet-4-6 and claude-haiku-4-5-20251001.
 * Runs both models in parallel with the same prompt and prints a side-by-side summary.
 *
 * Usage:  npx tsx scripts/compare-generate.ts
 */

import Anthropic from "@anthropic-ai/sdk";

const MODELS = [
  { id: "claude-sonnet-4-6",          label: "Sonnet 4.6" },
  { id: "claude-haiku-4-5-20251001",  label: "Haiku 4.5"  },
] as const;

// Fixed sample inventory — no DB needed
const SAMPLE_INVENTORY = `
produce: chicken breast (2 lbs), garlic (1 head), onion (2 large), lemon (3), spinach (5 oz bag), cherry tomatoes (1 pint), zucchini (2)
pantry: olive oil, canned chickpeas (2 cans), canned diced tomatoes (1 can), pasta (1 lb), rice (2 cups), chicken stock (32 oz), breadcrumbs
dairy: butter, heavy cream, parmesan cheese, greek yogurt (1 cup)
spice: cumin, paprika, turmeric, oregano, red pepper flakes, black pepper, salt
baking: flour, cornstarch
condiment: soy sauce, dijon mustard, hot sauce
`.trim();

const COUNT = 3;

function buildPrompt(inventory: string, count: number): string {
  return `You are a practical cooking assistant. Given a kitchen inventory, generate ${count} meal recipes the user can realistically make.

INVENTORY:
${inventory}

Generate exactly ${count} diverse recipes. Prioritize ingredients from the inventory; you may add up to 3 common extras if truly needed.

Return ONLY a JSON object with this exact structure — no markdown, no explanation:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "cuisine": "Italian",
      "complexity": "FAMILIAR",
      "servings": 2,
      "servingsMax": 4,
      "handsOnMin": 15,
      "totalMin": 30,
      "difficulty": 2,
      "equipment": ["STOVETOP"],
      "tags": ["WEEKNIGHT"],
      "instructions": "1. Step one.\\n2. Step two.\\n3. Step three.",
      "ingredients": [
        {
          "name": "chicken breast",
          "required": true,
          "quantityText": "2 pieces",
          "preparation": "cubed",
          "substitutions": ["chicken thighs"]
        }
      ],
      "techniques": ["sautéing"],
      "nutrition": { "caloriesPerServing": 450, "proteinG": 32, "carbsG": 48, "fatG": 12 },
      "reasoning": "Uses most of the pantry staples you have on hand."
    }
  ]
}

Field rules:
- complexity: FAMILIAR | STRETCH | CHALLENGE
- difficulty: 1 (very easy) to 5 (very hard)
- tags: WEEKNIGHT | POTLUCK | MEAL_PREP | QUICK | COMFORT | HEALTHY | VEGETARIAN | VEGAN | GLUTEN_FREE
- instructions: numbered steps joined with \\n, each starting with an action verb and including timing/sensory cues
- ingredients[].preparation: prep before cooking ("finely diced", "drained and rinsed")
- nutrition: realistic macro estimates per serving (all integers)`;
}

type Recipe = {
  title: string;
  cuisine?: string;
  complexity?: string;
  difficulty?: number;
  totalMin?: number;
  handsOnMin?: number;
  servings?: number;
  tags?: string[];
  ingredients?: { name: string; required?: boolean; quantityText?: string; preparation?: string }[];
  instructions?: string;
  techniques?: string[];
  nutrition?: { caloriesPerServing?: number; proteinG?: number; carbsG?: number; fatG?: number };
  reasoning?: string;
};

async function runModel(client: Anthropic, modelId: string, prompt: string) {
  const start = Date.now();
  const message = await client.messages.create({
    model: modelId,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });
  const elapsed = Date.now() - start;

  let text = (message.content[0] as { type: string; text: string }).text.trim();
  const fence = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (fence) text = fence[1].trim();
  else { const obj = text.match(/\{[\s\S]*\}/); if (obj) text = obj[0]; }

  let recipes: Recipe[] = [];
  try {
    const parsed = JSON.parse(text);
    recipes = parsed.recipes ?? [];
  } catch {
    console.error(`  [${modelId}] JSON parse failed`);
  }

  return {
    elapsed,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    stopReason: message.stop_reason,
    recipes,
  };
}

function scoreInstructions(instructions: string | undefined): { steps: number; hasVerbs: boolean; hasTiming: boolean } {
  if (!instructions) return { steps: 0, hasVerbs: false, hasTiming: false };
  const lines = instructions.split("\n").filter(l => l.trim());
  const hasVerbs = lines.filter(l => /^[0-9]+\.\s+[A-Z]/.test(l)).length > lines.length * 0.7;
  const hasTiming = /minute|second|hour|until|golden|fragrant|tender/i.test(instructions);
  return { steps: lines.length, hasVerbs, hasTiming };
}

function printRecipeSummary(r: Recipe, indent = "  ") {
  console.log(`${indent}${r.title}`);
  console.log(`${indent}  Cuisine: ${r.cuisine ?? "—"}  |  Complexity: ${r.complexity ?? "—"}  |  Difficulty: ${r.difficulty ?? "—"}/5`);
  console.log(`${indent}  Time: ${r.handsOnMin ?? "?"}m hands-on, ${r.totalMin ?? "?"}m total  |  Serves: ${r.servings ?? "?"}`);
  console.log(`${indent}  Tags: ${r.tags?.join(", ") ?? "—"}`);
  console.log(`${indent}  Techniques: ${r.techniques?.join(", ") ?? "—"}`);

  const reqIngs = r.ingredients?.filter(i => i.required !== false) ?? [];
  const optIngs = r.ingredients?.filter(i => i.required === false) ?? [];
  console.log(`${indent}  Ingredients: ${reqIngs.length} required${optIngs.length ? `, ${optIngs.length} optional` : ""}`);
  const withPrep = r.ingredients?.filter(i => i.preparation).length ?? 0;
  console.log(`${indent}    ${withPrep}/${r.ingredients?.length ?? 0} have preparation notes`);

  const { steps, hasVerbs, hasTiming } = scoreInstructions(r.instructions);
  console.log(`${indent}  Instructions: ${steps} steps  |  action verbs: ${hasVerbs ? "yes" : "no"}  |  timing/cues: ${hasTiming ? "yes" : "no"}`);

  if (r.nutrition) {
    const n = r.nutrition;
    console.log(`${indent}  Nutrition: ${n.caloriesPerServing ?? "?"}cal  ${n.proteinG ?? "?"}g protein  ${n.carbsG ?? "?"}g carbs  ${n.fatG ?? "?"}g fat`);
  }

  if (r.reasoning) {
    console.log(`${indent}  Reasoning: "${r.reasoning}"`);
  }
}

async function main() {
  const client = new Anthropic();
  const prompt = buildPrompt(SAMPLE_INVENTORY, COUNT);

  console.log(`\nComparing recipe generation: Sonnet 4.6 vs Haiku 4.5`);
  console.log(`Inventory: ${SAMPLE_INVENTORY.split("\n").length} categories, generating ${COUNT} recipes each`);
  console.log(`Running both models in parallel…\n`);

  const [sonnet, haiku] = await Promise.all(
    MODELS.map(m => runModel(client, m.id, prompt))
  );
  const results = [
    { label: MODELS[0].label, ...sonnet },
    { label: MODELS[1].label, ...haiku },
  ];

  // --- Summary table ---
  console.log("=".repeat(70));
  console.log("PERFORMANCE");
  console.log("=".repeat(70));
  for (const r of results) {
    console.log(`\n${r.label}`);
    console.log(`  Time:         ${(r.elapsed / 1000).toFixed(1)}s`);
    console.log(`  Input tokens: ${r.inputTokens}`);
    console.log(`  Output tokens: ${r.outputTokens}`);
    console.log(`  Stop reason:  ${r.stopReason}`);
    console.log(`  Recipes parsed: ${r.recipes.length}/${COUNT}`);
  }

  // --- Recipe detail ---
  for (const result of results) {
    console.log("\n" + "=".repeat(70));
    console.log(`RECIPES — ${result.label}`);
    console.log("=".repeat(70));
    if (result.recipes.length === 0) {
      console.log("  No recipes parsed.");
      continue;
    }
    for (let i = 0; i < result.recipes.length; i++) {
      console.log(`\n  [${i + 1}]`);
      printRecipeSummary(result.recipes[i]);
    }
  }

  // --- Side-by-side quality heuristics ---
  console.log("\n" + "=".repeat(70));
  console.log("QUALITY HEURISTICS");
  console.log("=".repeat(70));

  function qualityScore(recipes: Recipe[]) {
    let score = 0;
    let notes: string[] = [];

    const allTitles = recipes.map(r => r.title ?? "");
    const uniqueCuisines = new Set(recipes.map(r => r.cuisine ?? "")).size;
    if (uniqueCuisines >= COUNT) { score += 2; notes.push("all different cuisines (+2)"); }
    else if (uniqueCuisines > 1)  { score += 1; notes.push(`${uniqueCuisines} cuisines (+1)`); }

    for (const r of recipes) {
      const { steps, hasVerbs, hasTiming } = scoreInstructions(r.instructions);
      if (steps >= 5) { score += 1; notes.push(`${r.title}: ≥5 steps (+1)`); }
      if (hasVerbs)   { score += 1; notes.push(`${r.title}: action verbs (+1)`); }
      if (hasTiming)  { score += 1; notes.push(`${r.title}: timing cues (+1)`); }

      const withPrep = r.ingredients?.filter(i => i.preparation).length ?? 0;
      if (withPrep >= 3) { score += 1; notes.push(`${r.title}: prep notes (+1)`); }

      if (r.nutrition?.caloriesPerServing) { score += 1; notes.push(`${r.title}: nutrition (+1)`); }
      if ((r.techniques?.length ?? 0) >= 1) { score += 1; notes.push(`${r.title}: techniques (+1)`); }
      if (r.reasoning) { score += 1; notes.push(`${r.title}: reasoning (+1)`); }
    }

    return { score, notes };
  }

  const sq = qualityScore(sonnet.recipes);
  const hq = qualityScore(haiku.recipes);

  for (const [label, q, r] of [[MODELS[0].label, sq, sonnet], [MODELS[1].label, hq, haiku]] as const) {
    console.log(`\n${label}  →  quality score: ${q.score}`);
    for (const n of q.notes) console.log(`    + ${n}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("VERDICT");
  console.log("=".repeat(70));
  const speedup = (sonnet.elapsed / haiku.elapsed).toFixed(1);
  const qualityDiff = sq.score - hq.score;
  console.log(`\nHaiku is ${speedup}x faster than Sonnet`);
  console.log(`Quality gap: Sonnet scored ${sq.score}, Haiku scored ${hq.score} (diff: ${qualityDiff > 0 ? "+" : ""}${qualityDiff})`);
  if (qualityDiff <= 2) {
    console.log(`\nSuggestion: quality gap is small — Haiku likely worth it for the speed.`);
  } else if (qualityDiff <= 5) {
    console.log(`\nSuggestion: moderate quality gap — consider Haiku for quick/simple requests, Sonnet for complex ones.`);
  } else {
    console.log(`\nSuggestion: significant quality gap — Sonnet is worth the extra time.`);
  }
  console.log();
}

main().catch(console.error);
