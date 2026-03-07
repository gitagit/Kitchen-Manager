import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { scoreRecipe, buildCuisineHistory, buildTechniqueComfort } from "@/lib/scoring";
import { normName } from "@/lib/normalize";
import { getAuthContext } from "@/lib/mobile-auth";

const schema = z.object({
  servings: z.number().int().positive().optional(),
  maxTotalMin: z.number().int().positive().optional(),
  equipment: z.array(z.string()).optional(),
  tagsInclude: z.array(z.string()).optional(),
  tagsExclude: z.array(z.string()).optional(),
  mustUse: z.array(z.string()).optional(),
  occasion: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "WEEKNIGHT", "POTLUCK", "MEAL_PREP", "ANY"]).optional(),

  // New constraints
  cuisine: z.string().optional(),
  wantVariety: z.boolean().optional(),
  wantGrowth: z.boolean().optional(),
  complexity: z.enum(["FAMILIAR", "STRETCH", "CHALLENGE", "ANY"]).optional(),
  season: z.enum(["SPRING", "SUMMER", "FALL", "WINTER"]).optional(),
  techniques: z.array(z.string()).optional() // Filter by technique names
});

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const constraints = parsed.data;

  const items = await prisma.item.findMany({
    where: { workspaceId },
    include: { batches: true }
  });

  const invNames = new Set(items.map((i) => normName(i.name)));

  // Items expiring within 5 days
  const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const expiringNames = new Set(
    items
      .filter((i) => i.batches.some((b) => b.expiresOn && b.expiresOn <= soon))
      .map((i) => normName(i.name))
  );

  // Stale items (mirrors STALE_DAYS in ui.tsx; FREEZER location never stale)
  const STALE_DAYS: Record<string, number> = {
    SEAFOOD: 2, PRODUCE: 5, MEAT: 4, DAIRY: 7, PREPARED: 4,
    PANTRY: 30, CONDIMENT: 60, BAKING: 60, BEVERAGE: 14, OTHER: 14,
  };
  const FREEZER_STALE_DAYS = 90;

  const urgentSeen = new Set<string>();
  const urgentItems: { name: string; reason: "expiring" | "stale"; expiresOn?: string }[] = [];

  for (const item of items) {
    const soonBatch = item.batches.find((b) => b.expiresOn && b.expiresOn <= soon);
    if (soonBatch) {
      urgentItems.push({ name: item.name, reason: "expiring", expiresOn: soonBatch.expiresOn!.toISOString() });
      urgentSeen.add(item.name);
    }
  }
  for (const item of items) {
    if (urgentSeen.has(item.name)) continue;
    if (!item.lastConfirmed) continue;
    const staleDays = item.location === "FREEZER" ? FREEZER_STALE_DAYS : (STALE_DAYS[item.category] ?? 14);
    const diffMs = Date.now() - new Date(item.lastConfirmed).getTime();
    if (diffMs > staleDays * 24 * 60 * 60 * 1000) {
      urgentItems.push({ name: item.name, reason: "stale" });
    }
  }

  const recipes = await prisma.recipe.findMany({
    where: { workspaceId },
    include: {
      ingredients: true,
      cookLogs: true,
      techniques: {
        include: { technique: true }
      }
    }
  });

  // Build cuisine history for variety scoring
  const cuisineHistory = constraints.wantVariety
    ? buildCuisineHistory(recipes)
    : undefined;

  // Build technique comfort map for growth scoring
  let techniqueComfort = undefined;
  if (constraints.wantGrowth) {
    const techniques = await prisma.technique.findMany({ where: { workspaceId } });
    techniqueComfort = buildTechniqueComfort(techniques);
  }

  // Normalize technique filter names for matching
  const techniqueFilter = constraints.techniques?.map(t => normName(t)) ?? [];

  // Optional: filter by servings (loose) and techniques
  const filtered = recipes.filter((r) => {
    // Servings filter
    if (constraints.servings && r.servings) {
      // allow +- 2 servings; we can scale later
      // also check servingsMax for scalable recipes
      const minServes = r.servings;
      const maxServes = r.servingsMax ?? r.servings;
      const target = constraints.servings;
      if (!(target >= minServes - 2 && target <= maxServes + 2)) {
        return false;
      }
    }

    // Technique filter: recipe must have at least one of the requested techniques
    if (techniqueFilter.length > 0) {
      const recipeTechniques = r.techniques?.map(rt => normName(rt.technique.name)) ?? [];
      const hasMatch = techniqueFilter.some(t => recipeTechniques.includes(t));
      if (!hasMatch) return false;
    }

    return true;
  });

  // Build cost map from inventory items
  const itemCostMap = new Map<string, number>();
  for (const item of items) {
    const cost = (item.batches[0] as any)?.costCents ?? (item as any).defaultCostCents ?? null;
    if (cost != null) itemCostMap.set(normName(item.name), cost);
  }

  const scored = filtered
    .map((r) => scoreRecipe(r as any, invNames, expiringNames, constraints, cuisineHistory, techniqueComfort))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const withCost = scored.map(r => {
    const recipe = recipes.find(rec => rec.id === r.recipeId)!;

    const requiredIngs = recipe.ingredients.filter(ing => ing.required);
    const pricedIngs = requiredIngs.filter(ing => itemCostMap.has(normName(ing.name)));
    const matchedCount = pricedIngs.length;
    const totalRequired = requiredIngs.length;
    const coverage = totalRequired > 0 ? matchedCount / totalRequired : 0;

    if (coverage < 0.5) {
      return { ...r, costPerServing: null, costCoverage: null };
    }

    // Only sum ingredients that actually have a price (skip unpriced rather than adding 0)
    let totalCents = 0;
    for (const ing of recipe.ingredients) {
      const cost = itemCostMap.get(normName(ing.name));
      if (cost != null) totalCents += cost;
    }
    const costPerServing = recipe.servings > 0
      ? Math.round(totalCents / recipe.servings)
      : null;
    return {
      ...r,
      costPerServing,
      costCoverage: totalRequired > 0 ? { matched: matchedCount, total: totalRequired } : null
    };
  });

  return NextResponse.json({ results: withCost, urgentItems });
}
