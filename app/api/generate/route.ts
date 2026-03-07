import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAiLimit, recordAiCall, getAiLimit } from "@/lib/ai-limiter";
import { Logger } from "next-axiom";

export const maxDuration = 60; // AI generation can take 20-60s

const schema = z.object({
  maxTotalMin: z.number().int().positive().optional(),
  equipment: z.array(z.string()).optional(),
  cuisine: z.string().optional(),
  complexity: z.enum(["FAMILIAR", "STRETCH", "CHALLENGE"]).optional(),
  mustUse: z.array(z.string()).optional(),
  mealType: z.string().optional(),
  count: z.number().int().min(1).max(5).optional()
});

function normalizeInstructions(raw: string): string {
  if (!raw?.trim()) return raw;
  if (/^\s*1\./.test(raw)) return raw; // Already numbered
  const steps = raw.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  return steps.map((s, i) => `${i + 1}. ${s.replace(/^\d+\.\s*/, "")}`).join("\n");
}

export async function POST(req: Request) {
  const log = new Logger({ source: "generate" });

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const allowed = await checkAiLimit(workspaceId, "generate");
  if (!allowed) {
    return NextResponse.json(
      { error: `Daily recipe generation limit reached (${getAiLimit("generate")}/day). Try again tomorrow.` },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const constraints = parsed.data;

  // Fetch current inventory scoped to workspace
  const items = await prisma.item.findMany({
    where: { workspaceId },
    include: { batches: true }
  });

  // Build inventory description grouped by category
  const byCategory = new Map<string, string[]>();
  for (const item of items) {
    const cat = item.category.toLowerCase();
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    const batches = item.batches.map(b => b.quantityText).filter(Boolean).join(", ");
    byCategory.get(cat)!.push(batches ? `${item.name} (${batches})` : item.name);
  }
  const inventoryBlock = byCategory.size > 0
    ? Array.from(byCategory.entries())
        .map(([cat, names]) => `${cat}: ${names.join(", ")}`)
        .join("\n")
    : "No inventory data — generate versatile recipes using common pantry staples.";

  // Build constraints block
  const constraintLines: string[] = [];
  if (constraints.maxTotalMin) constraintLines.push(`Total time: ${constraints.maxTotalMin} minutes or less`);
  if (constraints.equipment?.length) constraintLines.push(`Equipment: ${constraints.equipment.join(", ")}`);
  if (constraints.cuisine) constraintLines.push(`Cuisine: ${constraints.cuisine}`);
  if (constraints.complexity) {
    const desc = { FAMILIAR: "easy, everyday", STRETCH: "some new techniques", CHALLENGE: "advanced" }[constraints.complexity];
    constraintLines.push(`Complexity: ${constraints.complexity} (${desc})`);
  }
  if (constraints.mustUse?.length) constraintLines.push(`Must include: ${constraints.mustUse.join(", ")}`);

  const count = constraints.count ?? 3;
  const mealLabel = constraints.mealType
    ? constraints.mealType.charAt(0).toUpperCase() + constraints.mealType.slice(1).toLowerCase()
    : "meal";

  const prompt = `You are a practical cooking assistant. Given a kitchen inventory, generate ${count} ${mealLabel.toLowerCase() === "any" ? "" : mealLabel.toLowerCase() + " "}recipes the user can realistically make.

INVENTORY:
${inventoryBlock}
${constraintLines.length > 0 ? `\nCONSTRAINTS:\n${constraintLines.join("\n")}` : ""}

Generate exactly ${count} diverse recipes. Each recipe must come from a different cuisine. Prioritize ingredients from the inventory; you may add up to 3 common extras if truly needed.

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
      "seasons": ["FALL", "WINTER"],
      "instructions": "1. Step one.\n2. Step two.\n3. Step three.",
      "ingredients": [
        {
          "name": "chicken breast",
          "required": true,
          "quantityText": "2 pieces",
          "preparation": "cubed",
          "substitutions": ["chicken thighs"]
        }
      ],
      "techniques": ["sautéing", "braising"],
      "nutrition": { "caloriesPerServing": 450, "proteinG": 32, "carbsG": 48, "fatG": 12 },
      "reasoning": "Uses most of the pantry staples you have on hand."
    }
  ]
}

Field rules:
- complexity: FAMILIAR | STRETCH | CHALLENGE
- equipment items: STOVETOP | OVEN | MICROWAVE | GRILL | INSTANT_POT | AIR_FRYER | BLENDER | FOOD_PROCESSOR
- tags: WEEKNIGHT | POTLUCK | MEAL_PREP | QUICK | COMFORT | HEALTHY | VEGETARIAN | VEGAN | GLUTEN_FREE
- seasons: SPRING | SUMMER | FALL | WINTER (all 4 if year-round)
- difficulty: 1 (very easy) to 5 (very hard)
- instructions: numbered steps joined with \\n. Every step must follow this format:
  • Start with an action verb (Heat, Add, Stir, Season, Whisk, Bake, Simmer, etc.)
  • Cover exactly one action — split compound actions into separate steps
  • Include heat level where applicable ("over medium-high heat", "at 400°F/200°C")
  • Include timing and a sensory cue ("2–3 minutes, until golden brown", "until fragrant", "until a toothpick comes out clean")
  • Do NOT include ingredient prep in steps (chopping, measuring, draining) — that belongs in the ingredient "preparation" field
  • The final step must be a serving instruction ("Divide into bowls and garnish with...", "Serve immediately over rice", etc.)
- ingredients[].preparation: how the ingredient should be prepped before cooking begins ("finely diced", "at room temperature", "drained and rinsed", "cut into 2cm cubes")
- nutrition: realistic macro estimates per serving based on ingredients and portion sizes (all values are integers)`;

  log.info("generate started", { workspaceId, count, constraints });

  const client = new Anthropic();

  let message;
  try {
    message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }]
    });
  } catch (err: any) {
    log.error("Claude API error", { workspaceId, error: err?.message });
    await log.flush();
    return NextResponse.json({ error: err?.message ?? "Claude API error" }, { status: 502 });
  }

  if (message.stop_reason === "max_tokens") {
    log.error("Response truncated at max_tokens", { workspaceId });
    await log.flush();
    return NextResponse.json({ error: "Recipe generation response was too long — try generating 1 or 2 recipes instead of 3." }, { status: 500 });
  }

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response type from Claude" }, { status: 500 });
  }

  // Strip markdown fences if present, then fall back to extracting the first {...} block
  let jsonText = content.text.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  } else {
    const objMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objMatch) jsonText = objMatch[0];
  }

  let result: { recipes: unknown[] };
  try {
    result = JSON.parse(jsonText);
  } catch (firstErr) {
    // Claude sometimes emits literal newlines inside JSON strings (especially in "instructions").
    // jsonrepair fixes that and other common AI JSON issues (trailing commas, etc.).
    try {
      result = JSON.parse(jsonrepair(jsonText));
      log.warn("JSON parse required repair", { workspaceId });
    } catch {
      log.error("JSON parse failed", {
        workspaceId,
        firstError: String(firstErr),
        rawResponse: jsonText.slice(0, 2000)
      });
      await log.flush();
      return NextResponse.json({ error: "Failed to parse Claude response as JSON" }, { status: 500 });
    }
  }

  const recipes = (result.recipes ?? []).map((r: any) => {
    const n = r.nutrition;
    return {
      ...r,
      instructions: typeof r.instructions === "string"
        ? normalizeInstructions(r.instructions)
        : r.instructions,
      caloriesPerServing: n?.caloriesPerServing ?? null,
      proteinG: n?.proteinG ?? null,
      carbsG: n?.carbsG ?? null,
      fatG: n?.fatG ?? null
    };
  });

  log.info("generate complete", { workspaceId, recipeCount: recipes.length });
  await recordAiCall(workspaceId, "generate");
  await log.flush();
  return NextResponse.json({ recipes });
}
